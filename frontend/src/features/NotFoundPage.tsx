import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() { return <main className="page"><div className="empty-state"><span className="error-code">Ups</span><h1>Esta serie no existe.</h1><p>Volvamos al plan antes de perder el ritmo.</p><Link className="primary-button" to="/"><ArrowLeft size={17} /> Ir al resumen</Link></div></main>; }
