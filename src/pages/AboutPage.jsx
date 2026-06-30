import { useState, useEffect } from "react";
import { api } from "../api";

export default function AboutPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAbout()
      .then(d => setData(d))
      .catch(() => setData({ title: "About YUMDs", body: "" }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="about-loading">Loading…</div>;

  return (
    <div className="about-page">
      <div className="about-card">
        <div className="about-logo">
          <img src="/Yarmouk.jpg" alt="Yarmouk University" className="about-logo-img" />
        </div>
        <h1 className="about-title">{data?.title || "About YUMDs"}</h1>
        {data?.body ? (
          <div className="about-body">
            {data.body.split("\n").map((line, i) =>
              line.trim() ? <p key={i}>{line}</p> : <br key={i} />
            )}
          </div>
        ) : (
          <p className="about-empty">No information has been added yet.</p>
        )}
      </div>
    </div>
  );
}
