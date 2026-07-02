import { motion } from 'framer-motion'

export default function Modal({ children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 backdrop-blur-[10px]"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-md"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
