import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

const Ctx = createContext({ toast: () => {} });
export const useToast = () => useContext(Ctx);
const ICONS = { success: CheckCircle2, warn: AlertTriangle, error: XCircle, info: Info };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3800);
  }, []);
  useEffect(() => {
    const onError = (event) => toast(event.detail || "Backend request failed", "error");
    window.addEventListener("resqflow-api-error", onError);
    return () => window.removeEventListener("resqflow-api-error", onError);
  }, [toast]);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div key={t.id} className={`toast toast-${t.type}`} layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}>
                <Icon size={18} /><span>{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
