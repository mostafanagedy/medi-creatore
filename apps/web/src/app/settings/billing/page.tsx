'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, CheckCircle2, CreditCard, Sparkles, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

export default function BillingPage() {
  const { user } = useAuthStore();
  const credits = user?.credits ?? 0;
  const currentPlan = user?.plan ?? 'Starter';
  const maxCredits = currentPlan === 'Pro' ? 50000 : currentPlan === 'Creator' ? 10000 : 1000;
  const usagePercentage = Math.min(Math.round(((maxCredits - credits) / maxCredits) * 100), 100);

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUpgrade = (plan: string) => {
    setIsLoading(plan);
    setTimeout(() => {
      setIsLoading(null);
      alert(`Redirecting to Stripe for ${plan} plan...`);
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-primary" />
          Billing & Credits
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan, view your credit usage, and upgrade for more AI power.
        </p>
      </div>

      <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Usage Card */}
        <motion.div variants={fadeInUp} className="md:col-span-3">
          <Card className="glass-card border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Current Credit Usage
              </CardTitle>
              <CardDescription>Your credits reset on the 1st of every month.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-4xl font-bold text-white">{credits.toLocaleString()}</span>
                  <span className="text-muted-foreground ml-2">/ {maxCredits.toLocaleString()} Credits Remaining</span>
                </div>
                <div className="text-sm font-medium text-primary">{100 - usagePercentage}% Left</div>
              </div>
              <Progress value={usagePercentage} className="h-3 bg-secondary" />
              
              {credits < 500 && (
                <div className="mt-4 flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  <AlertCircle className="w-4 h-4" />
                  Your credits are running low. Consider upgrading to avoid interruption.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pricing Plans */}
        <motion.div variants={fadeInUp}>
          <Card className="h-full flex flex-col bg-background/50 border-white/5">
            <CardHeader>
              <CardTitle>Starter</CardTitle>
              <CardDescription>Perfect for hobbyists.</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1,000 AI Credits / month</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 720p Video Generation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Standard Support</li>
                <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="w-4 h-4 opacity-30" /> No API Access</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled={currentPlan === 'Starter'}>
                {currentPlan === 'Starter' ? 'Current Plan' : 'Downgrade to Starter'}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card className="h-full flex flex-col border-primary/50 relative shadow-card-hover">
            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-wider">
              Most Popular
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Creator <Sparkles className="w-4 h-4 text-primary" />
              </CardTitle>
              <CardDescription>For serious content creators.</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 10,000 AI Credits / month</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 1080p Video Generation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Auto-publish to Socials</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Priority Support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-brand-gradient text-white border-0 hover:opacity-90"
                onClick={() => handleUpgrade('Creator')}
                disabled={!!isLoading || currentPlan === 'Creator'}
              >
                {currentPlan === 'Creator' ? 'Current Plan' : isLoading === 'Creator' ? 'Processing...' : 'Upgrade to Creator'}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card className="h-full flex flex-col bg-background/50 border-white/5">
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <CardDescription>For power users and agencies.</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 50,000 AI Credits / month</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 4K Video Generation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Custom AI Voices</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> API Access</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full hover:bg-white/5"
                onClick={() => handleUpgrade('Pro')}
                disabled={!!isLoading || currentPlan === 'Pro'}
              >
                {currentPlan === 'Pro' ? 'Current Plan' : isLoading === 'Pro' ? 'Processing...' : 'Upgrade to Pro'}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
