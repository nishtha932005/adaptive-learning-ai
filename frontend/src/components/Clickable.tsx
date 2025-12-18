import React from "react";
import { motion } from "framer-motion";

interface ClickableProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "button";
  children: React.ReactNode;
}

export function Clickable({ as = "div", className = "", children, ...rest }: ClickableProps) {
  const MotionTag: any = as === "button" ? motion.button : motion.div;
  return (
    <MotionTag
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={className}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}


