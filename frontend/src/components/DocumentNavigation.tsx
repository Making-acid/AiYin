import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n";

interface Props {
  fallback?: string;
}

export function DocumentNavigation({ fallback = "/" }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };

  return (
    <nav className="document-navigation" aria-label={t("documentNavigation")}>
      <button type="button" onClick={goBack}>{t("back")}</button>
      <button type="button" onClick={() => navigate("/")}>{t("home")}</button>
    </nav>
  );
}
