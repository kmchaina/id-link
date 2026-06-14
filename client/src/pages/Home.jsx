import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const search = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-800 to-brand-700 text-white px-4 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-4">🪪</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
            Lost your ID?<br />We can help.
          </h1>
          <p className="text-brand-100 text-lg mb-2">
            Search our database of found documents at Post Offices across Tanzania.
          </p>
          <p className="text-brand-200 text-sm mb-8">
            Pata kitambulisho chako kilichopotea — haraka, salama.
          </p>

          <form onSubmit={search} className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, e.g. Juma Hassan..."
              className="input flex-1 text-gray-900"
            />
            <button type="submit" className="bg-white text-brand-800 font-bold px-5 py-3 rounded-xl hover:bg-brand-50 transition-colors whitespace-nowrap">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: '🔍', step: '1', title: 'Search', desc: 'Search our database by name or region. Results are masked to protect privacy.' },
            { icon: '✅', step: '2', title: 'Verify & Pay', desc: 'Enter your full ID number to verify ownership, then pay TZS 10,000 to generate a collection token.' },
            { icon: '🏪', step: '3', title: 'Collect', desc: 'Visit any Post Office with your QR token. Staff verify your face and hand you the document.' },
          ].map(item => (
            <div key={item.step} className="card text-center">
              <div className="text-4xl mb-3">{item.icon}</div>
              <div className="text-xs font-bold text-brand-600 uppercase tracking-wide mb-1">Step {item.step}</div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-brand-50 px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6 text-gray-800">Simple, transparent fees</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: 'Recovery Fee', amount: '10,000', desc: 'Collect at the Post Office' },
              { name: 'Premium Delivery', amount: '25,000', desc: 'Courier delivery via EMS' },
              { name: 'Alert Subscription', amount: '5,000', desc: 'Get notified when your ID is found' },
            ].map(item => (
              <div key={item.name} className="card text-center">
                <p className="text-2xl font-bold text-brand-800">TZS {item.amount}</p>
                <p className="font-semibold text-gray-800 mt-1">{item.name}</p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">All fees via M-Pesa, Tigo Pesa, or Airtel Money</p>
        </div>
      </div>

      {/* Alert CTA */}
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <h2 className="text-xl font-bold mb-2">Haven't found your ID yet?</h2>
        <p className="text-gray-600 mb-5 text-sm">Set up an alert — we'll SMS you the moment a document matching your ID number is handed in.</p>
        <button onClick={() => navigate('/search?alert=1')} className="btn-primary max-w-xs mx-auto">
          Set up an alert (TZS 5,000)
        </button>
      </div>
    </div>
  );
}
