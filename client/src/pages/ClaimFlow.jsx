import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { initiateClaim, verifyOTP, resendOTP, pay } from '../api';
import QRToken from '../components/QRToken';
import { useLang } from '../contexts/LangContext';

function StepBar({ current, steps }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            i < current ? 'bg-brand-800 text-white' :
            i === current ? 'bg-brand-800 text-white ring-4 ring-brand-200' :
            'bg-gray-200 text-gray-500'
          }`}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-1 ${i < current ? 'bg-brand-800' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ClaimFlow() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();

  const STEPS = [t('claim_step_verify'), t('claim_step_phone'), t('claim_step_pay'), t('claim_step_collect')];

  const [step, setStep] = useState(0);
  const [idNumber, setIdNumber]         = useState('');
  const [phone, setPhone]               = useState('');
  const [delivery, setDelivery]         = useState(false);
  const [otp, setOtp]                   = useState('');
  const [claimId, setClaimId]           = useState(null);
  const [amount, setAmount]             = useState(10000);
  const [qrData, setQrData]             = useState(null);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await initiateClaim({ document_id: documentId, id_number: idNumber, phone, delivery_requested: delivery });
      setClaimId(res.data.claim_id);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please check your ID number.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTP = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await verifyOTP(claimId, otp);
      setAmount(res.data.amount_tzs);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setError(''); setLoading(true);
    try {
      const res = await pay(claimId);
      setQrData(res.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 mb-4 flex items-center gap-1">
        {t('claim_back')}
      </button>
      <h1 className="text-2xl font-bold mb-6">{t('claim_title')}</h1>
      <StepBar current={step} steps={STEPS} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Step 0 — ID verify */}
      {step === 0 && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('claim_id_label')}</label>
            <input
              type="text"
              value={idNumber}
              onChange={e => setIdNumber(e.target.value)}
              placeholder={t('claim_id_placeholder')}
              className="input font-mono"
              required
            />
            <p className="text-xs text-gray-400 mt-1">{t('claim_id_hint')}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('claim_phone_label')}</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+255 700 000 000"
              className="input"
              required
            />
            <p className="text-xs text-gray-400 mt-1">{t('claim_phone_hint')}</p>
          </div>
          <div className="card bg-gray-50">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={delivery} onChange={e => setDelivery(e.target.checked)} className="mt-0.5 accent-brand-700" />
              <div>
                <p className="font-semibold text-sm">{t('claim_delivery_label')}</p>
                <p className="text-xs text-gray-500">{t('claim_delivery_desc')}</p>
              </div>
            </label>
          </div>
          <div className="bg-brand-50 rounded-xl p-3 text-sm text-brand-800">
            <strong>{t('claim_total')}: TZS {delivery ? '25,000' : '10,000'}</strong> — {t('claim_paid_via')}
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('claim_verifying') : t('claim_verify_btn')}
          </button>
        </form>
      )}

      {/* Step 1 — OTP */}
      {step === 1 && (
        <form onSubmit={handleOTP} className="space-y-4">
          <div className="card bg-green-50 border-green-200">
            <p className="text-sm text-green-800">
              ✅ {t('claim_otp_verified')} <strong>{phone}</strong>.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('claim_otp_label')}</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder={t('claim_otp_placeholder')}
              className="input text-center text-2xl tracking-[0.5em] font-mono"
              required
            />
            <p className="text-xs text-gray-400 mt-1">{t('claim_otp_hint')}</p>
          </div>
          <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary">
            {loading ? t('claim_otp_verifying') : t('claim_otp_confirm')}
          </button>
          <button
            type="button"
            onClick={async () => {
              setError('');
              try {
                await resendOTP(claimId);
                alert('New OTP sent to ' + phone);
              } catch (e) {
                setError(e.response?.data?.error || 'Could not resend OTP');
              }
            }}
            className="text-sm text-brand-700 underline text-center w-full mt-1"
          >
            {t('claim_otp_resend')}
          </button>
        </form>
      )}

      {/* Step 2 — Payment */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-bold mb-3">{t('claim_payment_title')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('claim_recovery_fee')}</span>
                <span>TZS 10,000</span>
              </div>
              {delivery && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('claim_premium_delivery')}</span>
                  <span>TZS 15,000</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>{t('claim_total')}</span>
                <span>TZS {amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="card bg-gray-50">
            <p className="text-sm font-semibold text-gray-700 mb-2">{t('claim_pay_mobile')}</p>
            <div className="flex gap-2 mb-3">
              {['M-Pesa', 'Tigo Pesa', 'Airtel Money'].map(m => (
                <span key={m} className="text-xs bg-white border border-gray-200 rounded px-2 py-1">{m}</span>
              ))}
            </div>
            <p className="text-xs text-gray-500">{t('claim_pay_ussd')} ({phone}) {t('claim_pay_pin_note')}</p>
          </div>

          <button onClick={handlePay} disabled={loading} className="btn-primary">
            {loading ? t('claim_pay_processing') : `${t('claim_pay_btn')} ${amount.toLocaleString()}`}
          </button>
          <p className="text-xs text-center text-gray-400">{t('claim_pay_security')}</p>
        </div>
      )}

      {/* Step 3 — QR Token */}
      {step === 3 && qrData && (
        <QRToken qrDataUrl={qrData.qr} expiresAt={qrData.expires_at} amountPaid={amount} />
      )}
    </div>
  );
}
