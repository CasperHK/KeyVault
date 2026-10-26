package main

import (
	"context"
	"crypto/sha256"
	"embed"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	gopath "path"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	gothGithub "github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/google"

	"web-framework/internal/ai"
	"web-framework/internal/cache"
	"web-framework/internal/config"
	"web-framework/internal/cron"
	"web-framework/internal/database"
	"web-framework/internal/events"
	"web-framework/internal/jobs"
	"web-framework/internal/mail"
	"web-framework/internal/models"
	"web-framework/internal/routes"
	"web-framework/internal/services"
	"web-framework/internal/storage"
)

//go:embed all:web
var frontendFS embed.FS

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate (idempotent — GORM AutoMigrate is additive).
	// Disable with AUTO_MIGRATE=false for environments that run migrations
	// out-of-band via "./migrate".
	if strings.ToLower(os.Getenv("AUTO_MIGRATE")) != "false" {
		log.Println("Running auto-migrations...")
		if err := models.Migrate(db); err != nil {
			log.Fatalf("Auto-migration failed: %v", err)
		}
	}

	// First-boot seed: only runs when the users table is empty. On by default
	// with APP_ENV=development only; AUTO_SEED=true turns it on elsewhere.
	autoSeed := strings.ToLower(os.Getenv("AUTO_SEED"))
	seedEnabled := autoSeed == "true" || (autoSeed != "false" && cfg.AppEnv == "development")
	if seedEnabled {
		var userCount int64
		db.Model(&models.User{}).Count(&userCount)
		if userCount == 0 {
			log.Println("Empty database detected: running first-boot seed...")
			if err := database.Seed(db); err != nil {
				log.Printf("Warning: first-boot seed failed: %v", err)
			} else {
				log.Println("First-boot seed completed")
			}
		}
	}

	// Redis cache
	//
	// The driver's own logger goes first: without it, a project started with no
	// Redis running prints a wall of identical pool failures from inside go-redis
	// before any line of ours, and they look like a crash rather than a missing
	// optional service.
	cache.QuietDriverLogs()

	var cacheService *cache.Cache
	redisReachable := false
	if cfg.RedisURL != "" {
		c, err := cache.New(cfg.RedisURL)
		if err != nil {
			log.Printf("Redis is not reachable at %s: caching, background jobs and cron are off. Start it, or set REDIS_URL= in .env to run without it. (%v)", cfg.RedisURL, err)
		} else {
			cacheService = c
			redisReachable = true
			log.Println("Redis cache connected")
		}
	}

	// File storage. STORAGE_DRIVER=local keeps files in a directory on this
	// server and serves them from /files; minio, s3, r2 and b2 use a bucket.
	// STORAGE_DISKS adds named disks, such as a private bucket for backups,
	// which code reaches through storage.Disks.Get(name).
	storage.SetPublicPrefixes(cfg.StoragePublicPrefixes)
	var storageService *storage.Storage
	if s, err := storage.Open(cfg.StorageDriver, cfg.Storage, storage.LocalConfig{
		Root:      cfg.Storage.LocalRoot,
		PublicURL: cfg.Storage.PublicURL,
		Secret:    cfg.Storage.URLSecret,
	}); err != nil {
		log.Printf("Warning: Storage unavailable: %v (uploads disabled)", err)
	} else {
		storageService = s
		storage.Disks.SetDefault(s)
		log.Printf("File storage: %s", s.Describe())
	}
	for _, named := range cfg.StorageDisks {
		s, err := storage.Open(named.Driver, named.Storage, storage.LocalConfig{
			Root:      named.Storage.LocalRoot,
			PublicURL: named.Storage.PublicURL,
			Secret:    named.Storage.URLSecret,
		})
		if err != nil {
			log.Printf("Warning: storage disk %q unavailable: %v", named.Name, err)
			continue
		}
		storage.Disks.Add(named.Name, s)
		log.Printf("Storage disk %q: %s", named.Name, s.Describe())
	}

	// Email. MAIL_MAILER picks the transport: smtp, resend, mailgun, postmark,
	// sendgrid, ses, log or failover. Left empty, RESEND_API_KEY means Resend,
	// and development sends to Mailhog, falling back to the log.
	mailer, mailErr := mail.FromConfig(cfg)
	if mailErr != nil {
		log.Fatalf("Email: %v", mailErr)
	}
	if mailer != nil {
		log.Printf("Email: sending with %s", mailer.Driver())
	} else {
		log.Println("Warning: no mail driver configured (emails disabled). Set MAIL_MAILER, or RESEND_API_KEY for Resend.")
	}

	// AI service (Vercel AI Gateway)
	var aiService *ai.AI
	if cfg.AIGatewayAPIKey != "" {
		aiService = ai.New(cfg.AIGatewayAPIKey, cfg.AIGatewayModel, cfg.AIGatewayURL)
		log.Printf("AI service configured via AI Gateway (%s)", cfg.AIGatewayModel)
	}

	// Background jobs (asynq) — client (enqueue side)
	//
	// Only when Redis actually answered. jobs.NewClient parses the URL and builds
	// a client without connecting to anything, so "Job queue connected" used to
	// print on a machine with no Redis at all, right after the line saying Redis
	// was unreachable.
	var jobClient *jobs.Client
	if cfg.RedisURL != "" && redisReachable {
		jc, err := jobs.NewClient(cfg.RedisURL)
		if err != nil {
			log.Printf("Warning: Job queue unavailable: %v", err)
		} else {
			jobClient = jc
			log.Println("Job queue connected")
		}
	}

	// OAuth2 social login providers
	// Gothic keeps the OAuth handshake in a cookie of its own. Its key is derived
	// from the JWT secret rather than being it, so the cookie and the tokens never
	// share a key, and the cookie is HttpOnly, SameSite=Lax, and Secure when the
	// API is served over https.
	gothicKey := sha256.Sum256([]byte("gothic-cookie-store:" + cfg.JWTSecret))
	gothicStore := sessions.NewCookieStore(gothicKey[:])
	gothicStore.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   strings.HasPrefix(cfg.AppURL, "https://"),
		SameSite: http.SameSiteLaxMode,
	}
	gothic.Store = gothicStore
	var oauthProviders []goth.Provider
	if cfg.GoogleClientID != "" {
		oauthProviders = append(oauthProviders, google.New(
			cfg.GoogleClientID, cfg.GoogleClientSecret,
			cfg.AppURL+"/api/auth/oauth/google/callback",
		))
	}
	if cfg.GithubClientID != "" {
		oauthProviders = append(oauthProviders, gothGithub.New(
			cfg.GithubClientID, cfg.GithubClientSecret,
			cfg.AppURL+"/api/auth/oauth/github/callback",
		))
	}
	if len(oauthProviders) > 0 {
		goth.UseProviders(oauthProviders...)
	}

	// Build services
	svc := &routes.Services{
		Cache:   cacheService,
		Storage: storageService,
		Mailer:  mailer,
		AI:      aiService,
		Jobs:    jobClient,
	}

	// Setup router
	router := routes.Setup(db, cfg, svc)

	// Serve the embedded frontend.
	//
	// Two shapes end up in here. A Vite build is a SPA: one index.html, and the
	// router in the browser resolves every path. A Next export is one HTML file
	// per route, so /admin/dashboard is admin/dashboard.html, and handing back
	// the root index.html for it would serve the wrong page with a 200.
	//
	// The lookups are ordered, and the two HTML steps are misses for a SPA, which
	// has no per-route files: it falls through to index.html exactly as it did
	// before. One handler for both, rather than two that drift apart.
	//
	// index.html is pre-read and served with c.Data rather than through
	// http.FileServer, whose canonical-URL redirect causes ERR_TOO_MANY_REDIRECTS
	// behind Traefik and Cloudflare.
	feFS, err := fs.Sub(frontendFS, "web")
	if err != nil {
		log.Printf("Warning: embedded frontend not available: %v", err)
	} else {
		indexHTML, readErr := fs.ReadFile(feFS, "index.html")
		if readErr != nil {
			log.Printf("Warning: failed to read embedded index.html: %v", readErr)
		}
		fileServer := http.FileServer(http.FS(feFS))

		serveFile := func(c *gin.Context, name string) bool {
			data, readErr := fs.ReadFile(feFS, name)
			if readErr != nil {
				return false
			}
			c.Data(http.StatusOK, "text/html; charset=utf-8", data)
			return true
		}

		router.NoRoute(func(c *gin.Context) {
			if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
				c.Status(http.StatusNotFound)
				return
			}
			name := strings.TrimPrefix(gopath.Clean(c.Request.URL.Path), "/")

			// A real asset: JS, CSS, an image. FileServer sets the headers and
			// handles range requests.
			if name != "" && name != "index.html" {
				if st, statErr := fs.Stat(feFS, name); statErr == nil && !st.IsDir() {
					fileServer.ServeHTTP(c.Writer, c.Request)
					return
				}
			}

			// A clean URL, which a Next export has written as a file.
			if name != "" && gopath.Ext(name) == "" {
				if serveFile(c, name+".html") {
					return
				}
				if serveFile(c, name+"/index.html") {
					return
				}
			}

			// The SPA, or the export's own root.
			if indexHTML == nil {
				c.Status(http.StatusNotFound)
				return
			}
			c.Data(http.StatusOK, "text/html; charset=utf-8", indexHTML)
		})
	}

	// Start asynq worker (consumes the queue jobClient enqueues to).
	//
	// Also only when Redis answered: the worker polls in a loop, so without Redis
	// it writes an asynq error every second or two, forever. That noise was the
	// worst part of starting a project with no Redis running, and it drowned out
	// the one line that explained it.
	var workerStop func()
	if cfg.RedisURL != "" && redisReachable {
		stop, err := jobs.StartWorker(cfg.RedisURL, jobs.WorkerDeps{
			DB:      db,
			Mailer:  mailer,
			Storage: storageService,
			Cache:   cacheService,
		})
		if err != nil {
			log.Printf("Warning: Background worker failed to start: %v", err)
		} else {
			workerStop = stop
			log.Println("Background worker started")
		}
	}

	// Start cron scheduler, on the same condition and for the same reason.
	var cronScheduler *cron.Scheduler
	if cfg.RedisURL != "" && redisReachable {
		cs, cronErr := cron.Start(cfg, cacheService)
		if cronErr != nil {
			log.Printf("Warning: Cron scheduler failed to start: %v", cronErr)
		} else {
			cronScheduler = cs
		}
	}

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,

		// Short, because they are what stops a slow client holding a connection
		// open. Uploads, exports and streams get longer deadlines per route, from
		// middleware.RequestLimits in routes.go.
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Printf("Server starting on :%s", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down...")

	if cronScheduler != nil {
		cronScheduler.Stop()
	}
	if workerStop != nil {
		workerStop()
	}
	if jobClient != nil {
		_ = jobClient.Close()
	}
	if cacheService != nil {
		_ = cacheService.Close()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}

	// After the last request: stop claiming outbox messages this process will
	// not live to deliver, and write the activity rows still queued.
	events.StopRelay()
	services.FlushActivity(ctx)
	log.Println("Server stopped")
}
