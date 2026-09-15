export default function Layout({ title, subtitle, actions, children }) {
  return (
    <>
      <div className="topbar">
        <div>
          <h1>{title}</h1>
          <div className="subtitle">{subtitle}</div>
        </div>
        {actions}
      </div>
      <div className="content">{children}</div>
    </>
  );
}
