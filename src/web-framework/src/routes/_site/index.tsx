import { t, useLocale } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleDot,
  HardDrive,
  Layers3,
  LayoutDashboard,
  Laptop,
  LockKeyhole,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { Brand } from "@/components/keyvault-ui";
import { LanguageSelector } from "@/components/language-selector";
import "@/keyvault.css";

export const Route = createFileRoute("/_site/")({ component: HomePage });

function HomePage() {
  useLocale();

  return (
    <div className="kv kv-landing">
      <nav className="kv-public-nav">
        <Link to="/" aria-label={t("KeyVault home")}>
          <Brand />
        </Link>
        <div className="kv-nav-links">
          <a href="#features">{t("The platform")}</a>
          <a href="#how-it-works">{t("How it works")}</a>
          <a href="#built-for-teams">{t("Built for teams")}</a>
        </div>
        <div className="kv-public-actions">
          <LanguageSelector />
          <Link to="/login" className="kv-button dark">
            {t("Open workspace")} <ArrowUpRight size={16} />
          </Link>
        </div>
      </nav>
      <main>
        <section className="kv-hero">
          <div className="kv-hero-copy">
            <span className="kv-eyebrow">
              <span className="kv-live-dot" /> {t("A little order. A lot of possibility.")}
            </span>
            <h1>
              {t("Your IT, finally")}
              <br />
              {t("in")} <span className="kv-serif">{t("good hands.")}</span>
              <span className="kv-sparkle">
                <Sparkles />
              </span>
            </h1>
            <p>
              {t("Every device. Every person. Every connection.")}
              <br />
              {t("One beautifully organized home for your company's")}
              <br className="kv-desktop-break" /> {t("IT inventory. Meet KeyVault.")}
            </p>
            <div className="kv-hero-actions">
              <Link to="/login" className="kv-button primary large">
                {t("Step inside your workspace")} <ArrowRight size={18} />
              </Link>
              <a href="#features" className="kv-text-link">
                {t("Take a closer look")} <ArrowDown size={16} />
              </a>
            </div>
            <div className="kv-hero-proof">
              <div className="kv-proof-icons">
                <span>
                  <Laptop size={17} />
                </span>
                <span>
                  <Server size={17} />
                </span>
                <span>
                  <Smartphone size={17} />
                </span>
              </div>
              <span>
                {t("Less spreadsheet.")}
                <br />
                <strong>{t("More peace of mind.")}</strong>
              </span>
            </div>
          </div>
          <div className="kv-hero-art">
            <div className="kv-art-grid" />
            <div className="kv-orbit orbit-one" />
            <div className="kv-orbit orbit-two" />
            <div className="kv-floating-chip chip-top">
              <span className="kv-icon-tile green">
                <ShieldCheck size={23} />
              </span>
              <div>
                <strong>{t("Everything accounted for")}</strong>
                <span>{t("Your inventory, connected.")}</span>
              </div>
              <CheckCircle2 size={19} className="kv-green" />
            </div>
            <div className="kv-preview">
              <div className="kv-preview-top">
                <Brand />
                <span>
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="kv-preview-body">
                <div className="kv-preview-sidebar">
                  <LayoutDashboard />
                  <Laptop />
                  <Server />
                  <Users />
                  <Layers3 />
                </div>
                <div className="kv-preview-main">
                  <div className="kv-preview-heading">
                    <div>
                      <small>{t("YOUR WORKSPACE, AT A GLANCE")}</small>
                      <h3>{t("A clearer picture.")}</h3>
                    </div>
                    <span className="kv-mini-button">{t("+ Add asset")}</span>
                  </div>
                  <div className="kv-preview-stats">
                    <div>
                      <Laptop size={17} />
                      <strong>
                        128<small>{t("devices")}</small>
                      </strong>
                    </div>
                    <div>
                      <Users size={17} />
                      <strong>
                        42<small>{t("happy people")}</small>
                      </strong>
                    </div>
                    <div>
                      <CircleDot size={17} />
                      <strong>
                        100%<small>{t("visibility")}</small>
                      </strong>
                    </div>
                  </div>
                  <div className="kv-preview-table">
                    <span>
                      {t("YOUR INVENTORY")} <small>{t("All in one place")}</small>
                    </span>
                    {[
                      { icon: Laptop, name: "MacBook Pro", tag: "KV-LT-001", color: "violet" },
                      { icon: Server, name: "Production server", tag: "KV-SV-001", color: "blue" },
                      { icon: Smartphone, name: "iPhone 15 Pro", tag: "KV-MB-001", color: "pink" },
                    ].map((item) => (
                      <div key={item.tag}>
                        <span className={`kv-icon-tile ${item.color}`}>
                          <item.icon size={18} />
                        </span>
                        <div>
                          <b>{t(item.name)}</b>
                          <small>{item.tag}</small>
                        </div>
                        <span className="kv-mini-status">{t("In use")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="kv-floating-chip chip-bottom">
              <span className="kv-icon-tile violet">
                <Users size={23} />
              </span>
              <div>
                <strong>{t("The right device. The right person.")}</strong>
                <span>{t("Ownership made effortless.")}</span>
              </div>
            </div>
            <div className="kv-art-caption">
              <span /> {t("A place for everything. A connection to everyone.")}
            </div>
          </div>
        </section>
        <div className="kv-values-strip">
          <span>{t("BUILT FOR THE WAY YOUR TEAM WORKS")}</span>
          <div>
            <Check size={16} />
            {t("One source of truth")}
          </div>
          <div>
            <Check size={16} />
            {t("People-first inventory")}
          </div>
          <div>
            <Check size={16} />
            {t("Your data, your infrastructure")}
          </div>
        </div>
        <section id="features" className="kv-features">
          <div className="kv-section-heading">
            <div>
              <span className="kv-overline">{t("LESS FRICTION. MORE FLOW.")}</span>
              <h2>
                {t("The whole picture.")}
                <br />
                <span className="kv-serif">{t("Not another spreadsheet.")}</span>
              </h2>
            </div>
            <p>
              {t("From a new starter's first laptop to the server")}
              <br />
              {t("powering your business. Make every asset count.")}
            </p>
          </div>
          <div className="kv-feature-grid">
            {[
              {
                icon: Laptop,
                color: "violet",
                number: "01",
                title: t("Meet your inventory."),
                text: t(
                  "Laptops, desktops, phones and network equipment. Keep the details, status and warranty of every asset in one tidy place."
                ),
                tags: ["Devices", "Mobile phones", "Lifecycle"],
              },
              {
                icon: Users,
                color: "pink",
                number: "02",
                title: t("Put people in the picture."),
                text: t(
                  "Give every device a clear owner. Register your staff, organize departments and make handovers a little more human."
                ),
                tags: ["Staff directory", "Ownership", "Handovers"],
              },
              {
                icon: Server,
                color: "blue",
                number: "03",
                title: t("Connect the dots."),
                text: t(
                  "Know what runs where. Map hosted services to your servers and devices, with environments and ports at your fingertips."
                ),
                tags: ["Servers", "Services", "Hosting"],
              },
            ].map((feature) => (
              <article className="kv-feature-card" key={feature.number}>
                <div>
                  <span className={`kv-icon-tile ${feature.color}`}>
                    <feature.icon size={25} />
                  </span>
                  <span className="kv-feature-number">{feature.number}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <div className="kv-feature-tags">
                  {feature.tags.map((tag) => (
                    <span key={tag}>{t(tag)}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="kv-how">
          <span className="kv-overline">{t("FROM CHAOS TO CLARITY")}</span>
          <h2>
            {t("Small steps.")} <span className="kv-serif">{t("A big difference.")}</span>
          </h2>
          <div className="kv-steps">
            {[
              {
                title: t("Bring your assets together"),
                text: t("Add your hardware and the little details that matter."),
              },
              {
                title: t("Give everything a home"),
                text: t("Assign owners, locations and the services it hosts."),
              },
              {
                title: t("Make room for better work"),
                text: t("See what is available, in use or needs some attention."),
              },
            ].map((step, index) => (
              <div key={step.title}>
                <span>0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="built-for-teams" className="kv-bottom-cta">
          <span className="kv-icon-tile">
            <HardDrive size={26} />
          </span>
          <span className="kv-overline">{t("A CALMER WAY TO MANAGE IT")}</span>
          <h2>
            {t("Good things happen")}
            <br />
            {t("when everything")} <span className="kv-serif">{t("clicks.")}</span>
          </h2>
          <p>{t("Your next chapter of organized IT starts here.")}</p>
          <Link to="/login" className="kv-button dark large">
            {t("Let's get organized")} <ArrowRight size={18} />
          </Link>
          <span className="kv-privacy">
            <LockKeyhole size={13} /> {t("Privately hosted. Thoughtfully connected.")}
          </span>
        </section>
      </main>
      <footer className="kv-public-footer">
        <Link to="/">
          <Brand />
        </Link>
        <span>{t("A home for your IT. A little headspace for you.")}</span>
        <span>
          {t("Powered by Grit")} <span className="kv-footer-dot">/</span> {new Date().getFullYear()}{" "}
          KeyVault
        </span>
      </footer>
    </div>
  );
}
