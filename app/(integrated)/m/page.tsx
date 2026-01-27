"use client";

import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import Link from "next/link";
import { BiRightArrowAlt } from "react-icons/bi";

export default () => {
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const fadeInDown = {
        hidden: { opacity: 0, y: -500 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="standalone-container h-screen w-full px-4 flex flex-col gap-2 items-center justify-end">
            <motion.img variants={fadeInDown} initial="hidden" animate="visible" transition={{ duration: 3 }} className="max-w-[60%] mb-8 absolute top-[20%] left-1/2 transform -translate-x-1/2" src="/img/AviPrep-logo.png" />
            <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ duration: 1, delay: 2.5 }}
                className="w-full flex flex-col items-center justify-center gap-4 transform -translate-y-1/2"
            >
                <Link href="/m/register" className="w-full">
                    <Button size="lg" className="w-full text-lg font-medium">
                        <div className="flex items-center">
                            <span>Register for Free</span>
                            <BiRightArrowAlt className="text-4xl ml-2 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Button>
                </Link>
                <Link href="/m/login" className="w-full">
                    <Button variant="outline" size="lg" className="w-full">
                        <div className="flex items-center text-lg font-medium">
                            <span>Login</span>
                            <BiRightArrowAlt className="text-4xl ml-2 transition-transform" />
                        </div>
                    </Button>
                </Link>
            </motion.div>
        </div>
    )
}