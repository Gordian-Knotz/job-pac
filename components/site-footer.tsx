export function SiteFooter() {
  return (
    <footer className="border-t border-pac-line mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row justify-between gap-4 text-sm text-pac-muted">
        <p>&copy; {new Date().getFullYear()} PAC Africa — Priority Activator Consulting</p>
        <p className="font-mono text-xs uppercase tracking-wider">
          Jasmine Centre, Westlands, Nairobi
        </p>
      </div>
    </footer>
  );
}
