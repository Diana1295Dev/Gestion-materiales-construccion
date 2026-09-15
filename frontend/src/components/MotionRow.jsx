import { motion } from "framer-motion";

export default function MotionRow({ index = 0, children, ...props }) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.tr>
  );
}
