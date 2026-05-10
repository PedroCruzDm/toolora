import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useHomeView, type HomeView } from "@/lib/homeView";

export default function RedirectToRootWithView({ view }: { view: HomeView }) {
  const navigate = useNavigate();
  const { setView } = useHomeView();
  useEffect(() => {
    try {
      sessionStorage.setItem("toolora-home-view", view);
    } catch {
      // ignore sessionStorage failures and still navigate
    }
    setView(view);
    navigate("/", { replace: true });
  }, [navigate, setView, view]);
  return null;
}