// app/page.tsx
'use client';

import { motion } from 'framer-motion';
import {
    ArrowRight,
    Zap,
    Shield,
    Clock,
    Globe,
    ArrowDownToLine,
    ArrowUpFromLine,
    Send,
    CheckCircle,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Image from 'next/image';

const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white relative">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 opacity-60" />

                {/* Animated Background Orbs */}
                <motion.div
                    className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute bottom-20 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
                    animate={{
                        x: [0, -100, 0],
                        y: [0, -50, 0],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        className="text-center max-w-5xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm"
                        >
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">
                                Zero Gas Fees • Instant Settlement
                            </span>
                        </motion.div>

                        <motion.h1
                            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                        >
                            Send Money Globally
                            <br />
                            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
                                In Seconds
                            </span>
                        </motion.h1>

                        <motion.p
                            className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                        >
                            The first gasless cross-border payment app powered by USDC on Base.
                            Connect your bank, send instantly, withdraw anywhere.
                        </motion.p>

                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.8 }}
                        >
                            <Link href="/agent">
                                <Button
                                    size="lg"
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white px-8 group"
                                >
                                    Launch App
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <Link href="https://www.youtube.com/watch?v=FlFVucAgkOc" target="_blank" rel="noreferrer">
                                <Button size="lg" variant="outline" className="px-8">
                                    View Demo
                                </Button>
                            </Link>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20"
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                        >
                            {[
                                { label: 'Gas Fees', value: '$0', icon: Zap, color: 'blue' },
                                { label: 'Settlement', value: '<30s', icon: Clock, color: 'purple' },
                                { label: 'Countries', value: '180+', icon: Globe, color: 'green' },
                                { label: 'Success Rate', value: '99.9%', icon: CheckCircle, color: 'blue' },
                            ].map((stat, i) => (
                                <motion.div key={i} variants={fadeInUp}>
                                    <Card className="p-6 text-center bg-white/80 backdrop-blur border-gray-200 hover:shadow-lg transition-all hover:-translate-y-1 duration-300">
                                        <stat.icon className={`w-8 h-8 mx-auto mb-3 text-${stat.color}-600`} />
                                        <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                        <div className="text-sm text-gray-600">{stat.label}</div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">How FlowSend Works</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Three simple steps to send money anywhere in the world
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                    >
                        {[
                            {
                                icon: ArrowDownToLine,
                                step: '01',
                                title: 'Deposit from Bank',
                                description:
                                    'Connect your bank account and deposit USD. We automatically convert it to USDC on Base blockchain.',
                                color: 'blue',
                                features: ['Wire transfer', 'Instant minting', 'Circle powered', 'Fully automated'],
                            },
                            {
                                icon: Send,
                                step: '02',
                                title: 'Send Gaslessly',
                                description:
                                    'Send USDC to anyone globally with zero gas fees. Transactions settle in under 30 seconds on Base.',
                                color: 'purple',
                                features: ['Zero fees', '<30s settlement', 'Base blockchain', 'Smart wallets'],
                            },
                            {
                                icon: ArrowUpFromLine,
                                step: '03',
                                title: 'Withdraw to Bank',
                                description:
                                    'Convert USDC back to USD and withdraw directly to any bank account. Fast and secure.',
                                color: 'green',
                                features: ['Auto conversion', 'Bank payout', 'Secure', 'Same-day'],
                            },
                        ].map((step, i) => (
                            <motion.div key={i} variants={fadeInUp}>
                                <Card className="p-8 h-full bg-white hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden group">
                                    {/* Step Number Background */}
                                    <div className="absolute -right-4 -top-4 text-8xl font-bold text-gray-100 group-hover:text-gray-200 transition-colors">
                                        {step.step}
                                    </div>

                                    <div className="relative z-10">
                                        <div
                                            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
                                            style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
                                        >
                                            <step.icon className="w-7 h-7 text-white" />
                                        </div>

                                        <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                                        <p className="text-gray-600 mb-6">{step.description}</p>

                                        <ul className="space-y-2">
                                            {step.features.map((item, idx) => (
                                                <li key={idx} className="flex items-center text-sm text-gray-700">
                                                    <div className={`w-1.5 h-1.5 rounded-full bg-${step.color}-500 mr-2`} />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20">
                <div className="container mx-auto px-4">
                    <motion.div
                        className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div>
                            <motion.h2
                                className="text-4xl md:text-5xl font-bold mb-6"
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                Built for the
                                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    {' '}
                                    Future of Payments
                                </span>
                            </motion.h2>
                            <motion.div
                                className="space-y-6"
                                variants={staggerContainer}
                                initial="initial"
                                whileInView="animate"
                                viewport={{ once: true }}
                            >
                                {[
                                    {
                                        icon: Zap,
                                        title: 'Zero Gas Fees',
                                        description:
                                            'All transactions are completely free thanks to Coinbase Paymaster. No hidden costs ever.',
                                    },
                                    {
                                        icon: Clock,
                                        title: 'Instant Settlement',
                                        description:
                                            'Money moves in under 30 seconds, not 3-5 business days. Works 24/7 including weekends.',
                                    },
                                    {
                                        icon: Shield,
                                        title: 'Bank-Level Security',
                                        description:
                                            'Built on Circle\'s regulated infrastructure. Full KYC/AML compliance and transparent on-chain records.',
                                    },
                                    {
                                        icon: Globe,
                                        title: 'Global Reach',
                                        description:
                                            'Send to 180+ countries instantly. No borders, no delays, no complications.',
                                    },
                                ].map((benefit, i) => (
                                    <motion.div key={i} className="flex gap-4" variants={fadeInUp}>
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                            <benefit.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                                            <p className="text-gray-600">{benefit.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>

                        <motion.div
                            className="relative"
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <Card className="p-8 bg-gradient-to-br from-blue-600 via-purple-600 to-green-600 text-white relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                                <div className="relative z-10">
                                    <h3 className="text-3xl font-bold mb-4">Ready to start?</h3>
                                    <p className="mb-6 text-white/90 text-lg">
                                        Join thousands sending money globally with zero fees and instant settlement.
                                    </p>
                                    <div className="space-y-4 mb-8">
                                        {['No setup fees', 'No monthly charges', 'No hidden costs'].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <CheckCircle className="w-5 h-5" />
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Link href="/agent">
                                        <Button
                                            size="lg"
                                            variant="secondary"
                                            className="w-full group bg-white text-gray-900 hover:bg-gray-100"
                                        >
                                            Launch App Now
                                            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-200">
                <div className="container mx-auto px-4">
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold">FlowSend</span>
                        </div>
                        <p className="text-gray-600">
                            Built with ❤️ on Base | Powered by Circle & Coinbase
                        </p>
                        <p className="text-sm text-gray-500">© 2025 FlowSend. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
