'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkles, Video, Mic, Image as ImageIcon, Share2, BarChart3,
  Repeat2, Calendar, Brain, Play, ArrowRight, Check, Star,
  Zap, Globe, Lock, ChevronDown, Youtube, Instagram, Music2,
  Facebook, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerChildren = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const t = useTranslations('LandingPage');

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg gradient-text" dir="ltr">AI Content OS</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {['features', 'pricing', 'useCases', 'blog'].map((item) => (
                <a
                  key={item}
                  href={`#${item}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t(`navbar.${item}`)}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  {t('navbar.signIn')}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-brand-gradient hover:opacity-90 text-white border-0">
                  {t('navbar.getStartedFree')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
            className="space-y-8"
          >
            {/* Launch badge */}
            <motion.div variants={fadeIn} className="flex justify-center">
              <Badge className="px-4 py-1.5 text-sm bg-primary/10 border border-primary/30 text-primary gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                {t('hero.badge')}
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeIn}
              className="display-xl max-w-4xl mx-auto"
            >
              {t('hero.title1')}{' '}
              <span className="gradient-text">{t('hero.title2')}</span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              variants={fadeIn}
              className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              {t('hero.subtitle')}
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-brand-gradient text-white border-0 px-8 py-6 text-base font-semibold hover:opacity-90 glow-primary transition-all"
                >
                  <Sparkles className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {t('hero.ctaPrimary')}
                  <ArrowRight className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-6 text-base border-white/10 hover:bg-white/5 hover:border-white/20"
                >
                  <Play className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {t('hero.ctaSecondary')}
                </Button>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={fadeIn}
              className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                {t('hero.proof1')}
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                {t('hero.proof2')}
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                {t('hero.proof3')}
              </div>
            </motion.div>

            {/* Hero Dashboard Preview */}
            <motion.div
              variants={fadeIn}
              className="mt-12 relative"
            >
              <div className="glass-card p-1 rounded-2xl max-w-5xl mx-auto">
                <div className="bg-[#0d0d1a] rounded-xl overflow-hidden border border-white/5">
                  {/* Window chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/70" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                    </div>
                    <div className="flex-1 text-center">
                      <div className="inline-flex items-center gap-2 bg-white/5 rounded-md px-3 py-1 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        app.ai-content-os.com/dashboard
                      </div>
                    </div>
                  </div>

                  {/* Mock dashboard content */}
                  <div className="grid grid-cols-12 min-h-[400px]">
                    {/* Sidebar */}
                    <div className="col-span-2 bg-[#080812] border-r border-white/5 p-3 space-y-1">
                      {['Dashboard', 'AI Video', 'AI Script', 'AI Image', 'Calendar', 'Analytics'].map((item, i) => (
                        <div
                          key={item}
                          className={`px-2 py-1.5 rounded-md text-[10px] ${i === 0 ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* Main content */}
                    <div className="col-span-10 p-4 space-y-3">
                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: 'Videos Created', value: '47', color: 'text-violet-400' },
                          { label: 'Posts Scheduled', value: '128', color: 'text-cyan-400' },
                          { label: 'Credits Left', value: '1,850', color: 'text-emerald-400' },
                          { label: 'Total Reach', value: '2.4M', color: 'text-rose-400' },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-white/3 rounded-lg p-2.5 border border-white/5">
                            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                            <div className="text-[9px] text-muted-foreground">{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Content grid */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* Recent video */}
                        <div className="col-span-2 bg-white/3 rounded-lg border border-white/5 overflow-hidden">
                          <div className="aspect-video bg-gradient-to-br from-violet-900/50 to-cyan-900/50 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-1">
                                <Play className="w-4 h-4 text-white ml-0.5" />
                              </div>
                              <div className="text-[10px] text-white/70">AI Generated Video</div>
                            </div>
                          </div>
                          <div className="p-2">
                            <div className="text-[10px] font-medium text-foreground">How to grow on TikTok in 2025</div>
                            <div className="flex gap-1 mt-1">
                              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Published</span>
                              <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">AI Generated</span>
                            </div>
                          </div>
                        </div>

                        {/* AI generation panel */}
                        <div className="bg-white/3 rounded-lg border border-white/5 p-2.5 space-y-2">
                          <div className="text-[10px] font-medium text-foreground flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Generate Content
                          </div>
                          {['📝 Script', '🎥 Video', '🎙️ Voice', '🖼️ Image'].map((item) => (
                            <div
                              key={item}
                              className="text-[9px] bg-white/5 hover:bg-white/10 rounded px-2 py-1.5 cursor-pointer transition-colors text-muted-foreground"
                            >
                              {item}
                            </div>
                          ))}
                          <div className="mt-3 p-2 bg-primary/10 rounded border border-primary/20">
                            <div className="text-[9px] text-primary animate-pulse">✨ Generating script...</div>
                            <div className="mt-1 h-1 bg-primary/20 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full w-2/3 shimmer" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-4 top-16 glass-card px-3 py-2 rounded-xl hidden lg:flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-medium">Video published!</div>
                  <div className="text-[10px] text-muted-foreground">TikTok · Instagram Reels</div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-4 bottom-16 glass-card px-3 py-2 rounded-xl hidden lg:flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-medium">Script generated</div>
                  <div className="text-[10px] text-muted-foreground">2.4K views · 18% ER</div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Platform logos ── */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-8">
            Publish to all major platforms from one dashboard
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { name: 'YouTube', icon: Youtube, color: '#ff0000' },
              { name: 'Instagram', icon: Instagram, color: '#e1306c' },
              { name: 'TikTok', icon: Music2, color: '#69c9d0' },
              { name: 'Facebook', icon: Facebook, color: '#1877f2' },
              { name: 'Telegram', icon: Send, color: '#0088cc' },
            ].map((platform) => (
              <div
                key={platform.name}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <platform.icon
                  className="w-5 h-5"
                  style={{ color: platform.color }}
                />
                <span className="text-sm font-medium">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.div variants={fadeIn}>
              <Badge className="mb-4 bg-primary/10 border-primary/30 text-primary">Platform Features</Badge>
            </motion.div>
            <motion.h2 variants={fadeIn} className="display-lg mb-4">
              Everything you need to{' '}
              <span className="gradient-text">dominate content</span>
            </motion.h2>
            <motion.p variants={fadeIn} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              One platform to create, manage, publish, and analyze all your content.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeIn}
                className="glass-card p-6 group hover:border-primary/20 transition-all duration-300 hover:shadow-card-hover cursor-default"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                {feature.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {feature.tags.map((tag) => (
                      <span key={tag} className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── AI Pipeline Section ── */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5" />
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerChildren}
            >
              <motion.div variants={fadeIn}>
                <Badge className="mb-4 bg-violet-500/10 border-violet-500/30 text-violet-400">AI Video Pipeline</Badge>
              </motion.div>
              <motion.h2 variants={fadeIn} className="display-md mb-6">
                From idea to published
                <br />
                <span className="gradient-text">in minutes</span>
              </motion.h2>
              <motion.p variants={fadeIn} className="text-muted-foreground mb-8 leading-relaxed">
                Our AI pipeline handles every step of video creation — from generating the script
                to adding captions, voice, and publishing to all your channels.
              </motion.p>
              <motion.div variants={staggerChildren} className="space-y-4">
                {pipeline.map((step, index) => (
                  <motion.div key={step.title} variants={fadeIn} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-xs text-muted-foreground">{step.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              <motion.div variants={fadeIn} className="mt-8">
                <Link href="/register">
                  <Button className="bg-brand-gradient text-white border-0 hover:opacity-90">
                    Start Creating <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-6 space-y-3"
            >
              <div className="text-sm font-medium mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                AI Pipeline Running
              </div>
              {pipelineSteps.map((step, i) => (
                <div key={step.name} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    i < 4 ? 'bg-emerald-400' : i === 4 ? 'bg-primary animate-pulse' : 'bg-white/10'
                  }`} />
                  <div className="flex-1 text-sm text-muted-foreground">{step.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {i < 4 ? '✓' : i === 4 ? '⟳' : '○'}
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-primary font-medium">60%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-gradient rounded-full w-3/5 shimmer" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.div variants={fadeIn}>
              <Badge className="mb-4 bg-primary/10 border-primary/30 text-primary">Pricing</Badge>
            </motion.div>
            <motion.h2 variants={fadeIn} className="display-lg mb-4">
              Simple, transparent <span className="gradient-text">pricing</span>
            </motion.h2>
            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">
              Start free. Scale as you grow. No hidden fees.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeIn}
                className={`glass-card p-6 relative ${plan.highlighted ? 'border-primary/40 glow-primary' : ''}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand-gradient text-white border-0 text-xs px-3">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    className={`w-full ${plan.highlighted ? 'bg-brand-gradient text-white border-0 hover:opacity-90' : 'variant-outline border-white/10 hover:bg-white/5'}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="display-md mb-4">Frequently Asked <span className="gradient-text">Questions</span></h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="glass-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-medium text-sm">{faq.q}</h3>
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-violet-500/10 to-cyan-500/10" />
        <div className="max-w-3xl mx-auto text-center relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
          >
            <motion.h2 variants={fadeIn} className="display-lg mb-6">
              Ready to transform your <span className="gradient-text">content strategy?</span>
            </motion.h2>
            <motion.p variants={fadeIn} className="text-muted-foreground mb-8 text-lg">
              Join thousands of creators who use AI Content OS to produce more content, faster.
            </motion.p>
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-brand-gradient text-white border-0 px-8 py-6 text-base hover:opacity-90 glow-primary">
                  <Sparkles className="mr-2 w-4 h-4" />
                  Start Free — 100 AI Credits
                </Button>
              </Link>
            </motion.div>
            <motion.p variants={fadeIn} className="mt-4 text-xs text-muted-foreground">
              No credit card required · Full platform access · Cancel anytime
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold gradient-text">AI Content OS</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The AI-powered content operating system for modern creators.
              </p>
            </div>
            {footerLinks.map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © 2025 AI Content OS. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                SOC 2 Ready
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 text-amber-400" />
                4.9/5 rating
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────

const features = [
  {
    title: 'AI Video Generation',
    description: 'Generate professional videos from text prompts, scripts, or images. Support for text-to-video and script-to-video workflows.',
    icon: Video,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    tags: ['Text to Video', 'Script to Video', 'Multi-platform'],
  },
  {
    title: 'AI Script Generator',
    description: 'Create compelling scripts with hooks, CTAs, and storytelling. Supports Arabic, English, and multiple dialects.',
    icon: Sparkles,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    tags: ['Multi-language', 'Arabic RTL', 'Brand Voice'],
  },
  {
    title: 'AI Voice Generation',
    description: 'Generate natural-sounding voiceovers in multiple languages and styles. Supports male, female, and custom voices.',
    icon: Mic,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    tags: ['Arabic', 'English', 'Multiple styles'],
  },
  {
    title: 'AI Image Generation',
    description: 'Create stunning visuals, thumbnails, and social media graphics with advanced AI image models.',
    icon: ImageIcon,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    tags: ['DALL-E 3', 'Thumbnails', 'Social graphics'],
  },
  {
    title: 'Social Media Publishing',
    description: 'Schedule and publish to YouTube, Instagram, TikTok, Facebook, Telegram, and more from one place.',
    icon: Share2,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    tags: ['Auto-publish', 'Scheduling', '6+ platforms'],
  },
  {
    title: 'Content Analytics',
    description: 'Track views, engagement, reach, and growth across all platforms. AI-powered insights and recommendations.',
    icon: BarChart3,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    tags: ['Cross-platform', 'AI insights', 'Growth tracking'],
  },
  {
    title: 'Content Repurposing',
    description: 'Turn one long-form video into dozens of Shorts, Reels, clips, captions, and posts automatically.',
    icon: Repeat2,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    tags: ['Auto-clipping', 'Multi-format', 'Batch export'],
  },
  {
    title: 'Content Calendar',
    description: 'Plan, schedule, and manage your entire content strategy with a beautiful drag-and-drop calendar.',
    icon: Calendar,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    tags: ['Drag & drop', 'Month/week/day', 'Team sync'],
  },
  {
    title: 'AI Assistant',
    description: 'Your intelligent content partner. Ask it to create videos, write captions, analyze performance, and more.',
    icon: Brain,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    tags: ['Natural language', 'Tool use', 'Context-aware'],
  },
];

const pipeline = [
  { title: 'Write or paste your idea', desc: 'Start with any topic, script, or prompt' },
  { title: 'AI generates your script', desc: 'Hook, content, and CTA crafted by AI' },
  { title: 'Voice and visuals generated', desc: 'Voiceover and scenes created automatically' },
  { title: 'Auto-captions and editing', desc: 'Subtitles, music, and effects added' },
  { title: 'Publish everywhere', desc: 'One click to all your social platforms' },
];

const pipelineSteps = [
  { name: 'Script Generation' },
  { name: 'Storyboard Creation' },
  { name: 'Scene Generation' },
  { name: 'Voice Generation' },
  { name: 'Video Rendering' },
  { name: 'Caption Generation' },
  { name: 'Quality Check' },
  { name: 'Publishing' },
];

const pricingPlans = [
  {
    name: 'Free',
    description: 'Get started with AI content',
    price: '$0',
    period: '/month',
    highlighted: false,
    cta: 'Start Free',
    features: [
      '100 AI credits/month',
      '3 projects',
      '1 social account',
      'Basic AI models',
      '1GB storage',
      '7-day analytics',
    ],
  },
  {
    name: 'Starter',
    description: 'For individual creators',
    price: '$29',
    period: '/month',
    highlighted: false,
    cta: 'Start Starter',
    features: [
      '500 AI credits/month',
      '20 projects',
      '3 social accounts',
      'HD video (1080p)',
      '10GB storage',
      '30-day analytics',
      'Brand voice',
    ],
  },
  {
    name: 'Pro',
    description: 'For professionals',
    price: '$79',
    period: '/month',
    highlighted: true,
    cta: 'Start Pro',
    features: [
      '2,000 AI credits/month',
      'Unlimited projects',
      '10 social accounts',
      '4K video',
      '50GB storage',
      '90-day analytics',
      'AI Avatar',
      'Team (3 seats)',
    ],
  },
  {
    name: 'Business',
    description: 'For agencies & teams',
    price: '$199',
    period: '/month',
    highlighted: false,
    cta: 'Start Business',
    features: [
      '10,000 AI credits/month',
      'Unlimited everything',
      'Unlimited accounts',
      '4K video',
      '200GB storage',
      '1-year analytics',
      'API access',
      'Team (10 seats)',
    ],
  },
];

const faqs = [
  {
    q: 'What AI models do you use?',
    a: 'We use leading AI providers including OpenAI GPT-4o, Anthropic Claude, and specialized video/voice models. Our AI Gateway automatically routes your requests to the best available model.',
  },
  {
    q: 'Can I publish directly to social media?',
    a: 'Yes! You can connect your YouTube, Instagram, TikTok, Facebook, Telegram, and WhatsApp Business accounts and publish or schedule content directly from the platform.',
  },
  {
    q: 'Is Arabic content supported?',
    a: 'Absolutely. We fully support Arabic content generation including Modern Standard Arabic and Egyptian Arabic, with proper RTL display in the interface.',
  },
  {
    q: 'What happens if an AI provider is unavailable?',
    a: 'Our AI Gateway automatically falls back to alternative providers so your generation requests continue uninterrupted.',
  },
  {
    q: 'Can I use my own brand voice?',
    a: 'Yes! You can define your brand voice, tone, keywords, and style. All AI-generated content will automatically use your brand guidelines.',
  },
];

const footerLinks = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Blog', 'Tutorials'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Press', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'],
  },
];
