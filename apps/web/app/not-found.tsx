import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <p className="eyebrow">404</p>
      <h1 className="display-1" style={{ fontSize: 48 }}>Not found</h1>
      <p className="lead">This page does not exist.</p>
      <div className="row">
        <Link className="btn" href="/">Back home</Link>
      </div>
    </main>
  );
}
