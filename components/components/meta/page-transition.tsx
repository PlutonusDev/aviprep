"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { FaPlane, FaCloud } from "react-icons/fa";
import { useEffect, useState } from "react";

const AVIATION_FACTS = [
  "The four forces of flight: Lift, Weight, Thrust, and Drag.",
  "Clear air turbulence is invisible to radar.",
  "Situational awareness is key to safety.",
  "A standard traffic pattern turns left unless specified.",
  "V1 is the takeoff decision speed; once reached, you must fly.",
  "The Bernoulli Principle explains how air pressure differences create lift.",
  "Commercial jets usually fly at 30,000 to 40,000 feet to save fuel.",
  "Black boxes are actually bright orange for high visibility.",
  "The 'Dead Man's Foot' refers to the rudder pedal on a failed engine.",
  "Pilots and co-pilots usually eat different meals to avoid food poisoning.",
  "A 'Squawk' code is a four-digit number used for radar identification.",
  "7700 is the international squawk code for an emergency.",
  "The Pitot tube measures airspeed by calculating ram air pressure.",
  "Winglets reduce drag by minimizing wingtip vortices.",
  "Concorde's nose drooped for better visibility during takeoff.",
  "The world's largest passenger plane is the Airbus A380.",
  "Aviation fuel (Jet A) is essentially high-quality kerosene.",
  "A 'Go-around' is a standard safety procedure, not a failure.",
  "The sound barrier was first broken by Chuck Yeager in 1947.",
  "Mayday comes from the French 'm'aider,' meaning 'help me.'",
  "General aviation pilots use the 'IMSAFE' checklist before flying.",
  "The vertical stabilizer prevents the aircraft from yawing.",
  "Flaps increase lift and drag, allowing for slower landing speeds.",
  "A stall occurs when the wing exceeds its critical angle of attack.",
  "Most modern airliners can land themselves using Autoland systems.",
  "Turbulence is almost never a threat to a plane's structural integrity.",
  "Roger means 'received,' but it does not mean 'I will comply.'",
  "The phonetic alphabet ensures clear communication over radio.",
  "ELTs activate automatically to help rescuers find a downed aircraft.",
  "An aileron controls the roll of the aircraft.",
  "The elevator controls the pitch (up and down) of the aircraft.",
  "Mach 1 is the speed of sound, roughly 767 mph at sea level.",
  "Ground effect provides extra lift when flying very close to the runway.",
  "Aircraft tires are filled with nitrogen to prevent fires or bursts.",
  "The 'Glass Cockpit' replaced analog gauges with digital screens.",
  "A 'Taildragger' has its third wheel at the back instead of the nose.",
  "CRM focuses on communication and teamwork in the cockpit.",
  "The 'Age 65 Rule' is the mandatory retirement age for airline pilots.",
  "Wake turbulence from heavy jets can flip smaller aircraft.",
  "Density altitude is how the plane 'feels' the air based on heat.",
  "An altimeter uses barometric pressure to determine height.",
  "VFR means Visual Flight Rules; IFR means Instrument Flight Rules.",
  "The Wright Brothers' first flight was shorter than a 747's wingspan.",
  "FOD (Foreign Object Debris) can destroy a jet engine in seconds.",
  "A 'Slip' is used to lose altitude quickly without gaining airspeed.",
  "Dead Reckoning is navigating using time, speed, and distance.",
  "Hypoxia is a lack of oxygen that can impair a pilot's judgment.",
  "TCAS helps pilots avoid mid-air collisions automatically.",
  "Altitude gain results in a roughly 2°C drop in temperature per 1,000 feet.",
  "The 'Great Circle' route is the shortest distance between two points on Earth."
];

export default function PageTransition() {
  const pathname = usePathname();
  const [fact, setFact] = useState("");
  const [isTriggered, setIsTriggered] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handleStart = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.style.overflow = "hidden";
      setFact(AVIATION_FACTS[Math.floor(Math.random() * AVIATION_FACTS.length)]);
      setTimeout(() => {
        setHidden(false);
        setIsTriggered(true);
      }, 500);
    };

    window.addEventListener("trigger-transition-start", handleStart);

    setIsTriggered(false);
    setTimeout(() => {
      setHidden(true);
    }, 1600);
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      document.body.style.overflow = "unset";
    }, 1500);

    return () => {
      window.removeEventListener("trigger-transition-start", handleStart);
      clearTimeout(timer);
    };
  }, [pathname]);

  const transitionSettings = { duration: 2, ease: [0.22, 1, 0.36, 1] as const };

  const planeVariants = {
    vibration: {
      y: [0, -1, 1, 0],
      transition: {
        duration: 2.5,
        repeat: Infinity,
      }
    }
  } as any;

  const factVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.5,
        staggerChildren: 0.02, // Speed of the typewriter
      },
    },
  } as any;

  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    },
  } as any;

  return (
    <div className={`absolute w-full min-h-screen z-[100] pointer-events-none ${hidden ? "hidden" : ""}`} >
      <AnimatePresence mode="wait">
        <motion.div key={pathname} className="w-full h-full absolute inset-0">
          <motion.div
            className="absolute inset-0 z-40 bg-secondary"
            initial={{ y: "100%", opacity: 0 }}
            animate={isTriggered ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={transitionSettings}
          />

          <motion.div
            className="absolute inset-0 z-50 bg-primary"
            initial={{ y: "100%", opacity: 0 }}
            animate={isTriggered ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{ ...transitionSettings, delay: 0.1 }}
          />

          <motion.div
            className="absolute inset-0 z-60 bg-background"
            initial={{ y: "100%", opacity: 0 }}
            animate={isTriggered ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{ ...transitionSettings, delay: 0.2 }}
          />

          <motion.div
            className="absolute inset-0 z-60 bg-background overflow-hidden"
            initial={{ y: "100%" }}
            animate={isTriggered ? { y: "0%" } : { y: "100%" }}
            transition={{ ...transitionSettings, delay: 0.2 }}
          >
            <motion.div
              className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 text-primary text-8xl"
              initial={{ opacity: 1, rotate: -90, y: 300 }}
              animate={isTriggered ? { opacity: 1, y: 0 } : { opacity: 0, y: 300 }}
              transition={{ ...transitionSettings, delay: 0.2 }}
            >
              <motion.div
                animate={{ opacity: [0.5, 0.7, 0.5], scale: [1, 1.2, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute top-1/2 -right-4 w-32 h-8 bg-primary/10 blur-xl rounded-full -translate-y-1/2"
              />

              <motion.div variants={planeVariants as any} animate="vibration">
                <FaPlane />
              </motion.div>

              <div className="absolute top-4 right-14 w-64 h-[1px] bg-gradient-to-l from-primary/20 to-transparent" />
              <div className="absolute top-20 right-14 w-64 h-[1px] bg-gradient-to-l from-primary/20 to-transparent" />
            </motion.div>

            {/* Clouds */}
            <div className="absolute bottom-[-60px] w-full text-foreground/10 flex justify-between px-24">
              <FaCloud className="text-9xl transform -translate-y-96" />
              <FaCloud className="text-[10rem] transform -translate-y-100 scale-150" />
              <FaCloud className="text-9xl transform -translate-y-64" />
            </div>

            <motion.div
              className="absolute top-1/3 left-1/2 h-[20%] transform -translate-x-1/2 z-60 p-8 text-center max-w-6xl"
              variants={factVariants}
              initial="hidden"
              animate={isTriggered ? "visible" : "hidden"} // Parent controls everything
            >
              <h3 className="text-xl md:text-xl text-foreground font-light leading-relaxed text-center max-w-6xl">
                {fact.split("").map((char, i) => (
                  <motion.span
                    key={`${char}-${i}`}
                    variants={letterVariants} // Inherits 'visible' from parent
                  >
                    {char}
                  </motion.span>
                ))}
              </h3>
            </motion.div>
          </motion.div>

          {/* --------------- */}

          <motion.div
            className="absolute inset-0 z-40 bg-secondary"
            initial={{ y: "0%" }}
            animate={{ y: "-105%" }}
            transition={transitionSettings}
          />

          <motion.div
            className="absolute inset-0 z-50 bg-primary"
            initial={{ y: "0%" }}
            animate={{ y: "-105%" }}
            transition={{ ...transitionSettings, delay: 0.1 }}
          />

          <motion.div
            className="absolute inset-0 z-60 bg-background overflow-hidden"
            initial={{ y: "0%" }}
            animate={{ y: "-105%" }}
            transition={{ ...transitionSettings, delay: 0.2 }}
          >
            <motion.div
              className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 text-primary text-8xl"
              initial={{ opacity: 1, rotate: -90 }}
            >
              <motion.div
                animate={{ opacity: [0.5, 0.7, 0.5], scale: [1, 1.2, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute top-1/2 -right-4 w-32 h-8 bg-primary/10 blur-xl rounded-full -translate-y-1/2"
              />

              <motion.div variants={planeVariants as any} animate="vibration">
                <FaPlane />
              </motion.div>

              <div className="absolute top-4 right-14 w-64 h-[1px] bg-gradient-to-l from-primary/20 to-transparent" />
              <div className="absolute top-20 right-14 w-64 h-[1px] bg-gradient-to-l from-primary/20 to-transparent" />
            </motion.div>

            <div className="absolute bottom-[-60px] w-full text-foreground/10 flex justify-between px-24">
              <FaCloud className="text-9xl transform -translate-y-96" />
              <FaCloud className="text-[10rem] transform -translate-y-100 scale-150" />
              <FaCloud className="text-9xl transform -translate-y-64" />
            </div>

            <motion.div
              className="absolute top-1/3 left-1/2 h-[20%] transform -translate-x-1/2 z-60 p-8 text-center max-w-6xl"
              variants={factVariants}
              initial="visible"
            >
              <h3 className="text-xl md:text-xl text-foreground font-light leading-relaxed text-center max-w-6xl">
                {fact}
              </h3>
            </motion.div>
          </motion.div>

        </motion.div>
      </AnimatePresence>
    </div >
  );
}