"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import WorkerMap from "@/components/WorkerMap";
import { Wrench, ShieldCheck, TrendingUp, Users, Vote, BarChart3, Briefcase, CheckCircle, Shield, MapPin, Phone, MessageCircle, Camera, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import AdminBackground from "@/components/AdminBackground";
import dynamic from "next/dynamic";

const LiveTrackingMap = dynamic(() => import("@/components/LiveTrackingMap"), {
  ssr: false,
  loading: () => <div className="h-[250px] bg-white/10 rounded-xl flex items-center justify-center text-white/60">Loading map...</div>
});

import { useTranslation } from "@/hooks/useTranslation";
import { API_URL, apiFetch } from "@/lib/api";

// Must match the flat diagnostic fee charged by POST /api/bookings
const INSPECTION_FEE = 100;
// Fallback shown when the browser has no location permission (demo city).
const DEFAULT_CUSTOMER_LOCATION = { lat: 20.2961, lng: 85.8245 };



export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const { t } = useTranslation(language);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token || !storedUser) {
      router.push("/login");
    } else {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return <div className="p-8 text-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navbar */}
      <nav className="relative z-[60] bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">{t('nav.platformName')}</h1>
        <div className="flex items-center gap-4">
          {user.role === 'worker' && (
            <a href="/profile" className="text-sm font-medium text-white bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition flex items-center gap-1">
              {t('nav.editProfile')}
            </a>
          )}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="bg-white/20 px-3 py-1 rounded-lg text-sm hover:bg-white/30 transition flex items-center gap-1"
            title="Switch Language"
          >
            {language === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
          </button>
          <span className="hidden sm:block">{t('nav.welcome')}, {user.name} ({user.role})</span>
          <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded text-sm hover:bg-red-600 transition">
            {t('nav.logout')}
          </button>
        </div>
      </nav>

      {/* Render the correct dashboard based on role */}
      <main className="p-4 sm:p-8 max-w-7xl mx-auto">
        {user.role === "customer" && <CustomerDashboard token={localStorage.getItem("token")} language={language} />}
        {user.role === "worker" && <WorkerDashboard token={localStorage.getItem("token")} language={language} />}
        {user.role === "admin" && (
          <AdminDashboard token={localStorage.getItem("token")} handleLogout={handleLogout} language={language} />
        )}
      </main>
    </div>
  );
}

// =================================================================
// CUSTOMER DASHBOARD
// =================================================================
function CustomerDashboard({ token, language }: { token: string | null, language: 'en' | 'hi' }) {
  const { t } = useTranslation(language);
  const [services, setServices] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [minDateTime, setMinDateTime] = useState("");
  const [activeTab, setActiveTab] = useState<'browse' | 'active' | 'history'>('browse');
  const [workerLocation, setWorkerLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [customerLocation, setCustomerLocation] = useState(DEFAULT_CUSTOMER_LOCATION);
  const socketRef = useRef<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchServices();
    fetchBookings();
  }, []);





  const fetchServices = async () => {
    try {
      const res = await fetch(API_URL + "/api/services");
      if (res.ok) setServices(await res.json());
    } catch (error) { console.error("Failed to fetch services"); }
  };
  const fetchBookings = async () => {
    try {
      const res = await apiFetch(API_URL + "/api/bookings/customer-bookings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched bookings:', data); // ✅ Debug log
        setBookings(data);
        // } else {
        //   console.error('Failed to fetch bookings:', await res.text());
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    }
  };
  const handleServiceClick = async (service: any) => {
    setSelectedService(service); setActiveTab('browse');
    try { const res = await fetch(`${API_URL}/api/workers?skill=${service.name}`); if (res.ok) setWorkers(await res.json()); } catch (error) { console.error("Failed to fetch workers"); }
  };
  const approveQuote = async (bookingId: string, approved: boolean) => {
    try {
      const res = await apiFetch(`${API_URL}/api/bookings/${bookingId}/approve-quote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approved })
      });

      if (res.ok) {
        alert(approved ? 'Quote approved! Worker will proceed.' : 'Quote declined. Only diagnostic fee charged.');
        fetchBookings(); // Refresh bookings
      } else {
        alert('Failed to process approval');
      }
    } catch (error) {
      console.error('Approval error:', error);
      alert('Something went wrong');
    }
  };
  const handleBookNow = (worker: any) => {
    setSelectedWorker(worker);
    setShowBookingModal(true);
    const thirtyMinLater = new Date(Date.now() + 30 * 60 * 1000);
    setMinDateTime(thirtyMinLater.toISOString().slice(0, 16));

  };
  const confirmBooking = async () => {
    // ✅ Validate booking date
    const selectedDate = new Date(bookingDate);
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + 7); // 7 days from now

    if (selectedDate < now) {
      alert("Cannot book for past dates!");
      return;
    }

    // If booking for today, must be at least 30 minutes from now
    const isToday = selectedDate.toDateString() === now.toDateString();
    if (isToday) {
      const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      if (selectedDate < thirtyMinLater) {
        alert("For same-day bookings, please schedule at least 30 minutes in advance.");
        return;
      }
    }

    // Cannot book more than 7 days in advance
    if (selectedDate > maxDate) {
      alert("You can only book up to 7 days in advance.");
      return;
    }
    try {
      const res = await apiFetch(API_URL + "/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          workerId: selectedWorker.userId._id,
          serviceId: selectedService._id,
          date: bookingDate,
          totalAmount: selectedService.basePrice,
          photos: selectedPhotos // ✅ Send photos with the booking!
        })
      });
      if (res.ok) {
        alert("Booking Successful!");
        setShowBookingModal(false);
        setSelectedWorker(null);
        setSelectedService(null);
        setSelectedPhotos([]); // ✅ Clear photos after booking
        fetchBookings();
      } else { alert("Booking failed"); }
    } catch (error) { alert("Something went wrong"); }
  };
  const submitReview = async () => {
    if (!reviewComment.trim()) { alert("Please write a short comment."); return; }
    try {
      const res = await apiFetch(`${API_URL}/api/bookings/${selectedBookingForReview._id}/review`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ rating: reviewRating, comment: reviewComment }) });
      if (res.ok) { alert("Thank you for your feedback! ⭐"); setShowReviewModal(false); setSelectedBookingForReview(null); setReviewComment(""); setReviewRating(5); fetchBookings(); } else { const data = await res.json(); alert(data.message || "Failed to submit review"); }
    } catch (error) { alert("Something went wrong"); }
  };
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('photo', files[i]);
      try {
        const res = await apiFetch(API_URL + '/api/upload/image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.url);
        }
      } catch (error) { console.error('Photo upload failed:', error); }
    }

    // ✅ Add newly uploaded photos to the existing selected photos
    setSelectedPhotos(prev => [...prev, ...uploadedUrls]);
    setUploadingPhoto(false);
  };

  const activeBookings = bookings.filter((b: any) =>
    b.status === 'pending' ||
    b.status === 'accepted' ||
    b.status === 'pending_approval' ||
    b.status === 'in_progress'
  );
  const historyBookings = bookings.filter((b: any) =>
    b.status === 'completed' ||
    b.status === 'cancelled'
  );
  // Plain string so the socket effect only re-runs when the set of rooms changes,
  // not on every render (activeBookings is a new array each time).
  const activeBookingIds = activeBookings.map((b: any) => b._id).join(',');

  useEffect(() => {
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    activeBookingIds
      .split(',')
      .filter(Boolean)
      .forEach((bookingId) => socket.emit('join_booking', bookingId));

    socket.on('worker_moved', (data: any) => {
      setWorkerLocation({ lat: data.lat, lng: data.lng });
    });

    return () => {
      socket.off('worker_moved');
      socket.disconnect();
    };
  }, [activeBookingIds, token]);

  useEffect(() => {
    if (activeTab !== 'active' || activeBookings.length === 0 || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setCustomerLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => { /* keep the fallback location when permission is unavailable */ }
    );
  }, [activeTab, activeBookings.length]);

  return (
    <div className="relative min-h-screen">
      <AdminBackground />
      <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{t('customer.dashboardTitle')}</h1>
            <p className="text-white/70">{t('customer.dashboardSubtitle')}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2 bg-white/5 backdrop-blur-lg p-2 rounded-2xl border border-white/10">
          <button onClick={() => setActiveTab('browse')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'browse' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>{t('customer.tabBrowse')}</button>
          <button onClick={() => setActiveTab('active')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'active' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>📋 {t('customer.tabActive')} ({activeBookings.length})</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'history' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>{t('customer.tabHistory')}</button>
        </motion.div>

        {activeTab === 'browse' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Wrench className="text-indigo-400" /> {t('customer.headingWhatService')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {services.map((service: any, index) => (
                <motion.div key={service._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -5 }} onClick={() => handleServiceClick(service)} className={`bg-white/10 backdrop-blur-lg p-6 rounded-2xl border cursor-pointer transition hover:bg-white/20 ${selectedService?._id === service._id ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-white/20'}`}>
                  <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                  <p className="text-white/70 text-sm mt-1">{t('customer.startingAt')} ₹{INSPECTION_FEE}</p>
                </motion.div>
              ))}
            </div>
            {selectedService && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">{t('customer.verifiedWorkersFor')} {selectedService.name}</h3>
                {workers.length > 0 && <WorkerMap workers={workers} />}
                {workers.length === 0 ? <p className="text-white/60 text-center py-4">{t('customer.noWorkers')}</p> : (
                  <div className="space-y-4 mt-4">
                    {workers.map((worker: any, index) => (
                      <motion.div key={worker._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition">
                        <div>
                          <p className="font-semibold text-white text-lg">{worker.userId?.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex text-yellow-400 text-sm">{'★'.repeat(Math.round(worker.rating))}{'☆'.repeat(5 - Math.round(worker.rating))}</div>
                            <span className="text-white/60 text-xs">({worker.reviewCount || 0} reviews)</span>
                            <span className="text-white/40 text-xs">|</span>
                            <span className="text-emerald-300 text-xs">{worker.insuranceStatus}</span>
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30">✅ Cooperative Verified</span>
                        </div>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleBookNow(worker)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 shadow-lg">{t('customer.bookNow')}</motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'active' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">{t('customer.tabActive')} Bookings</h3>
            {activeBookings.length === 0 ? (
              <div className="text-center py-12"><div className="inline-block p-6 bg-white/5 rounded-full mb-4"><span className="text-6xl">☕</span></div><p className="text-white/60 text-lg">{t('customer.noActiveBookings')}</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeBookings.map((booking: any, index) => (
                  <motion.div key={booking._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-white text-lg">{booking.serviceId?.name}</h4>
                        <p className="text-white/60 text-sm">{t('customer.workerLabel')}: {booking.workerId?.name}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === 'accepted' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                        {booking.status === 'accepted' ? t('customer.inProgress') : t('customer.pending')}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm">📅 {new Date(booking.date).toLocaleString()}</p>
                    <p className="text-white font-bold text-2xl mt-3">₹{booking.totalAmount}</p>

                    {/* ✅ Quote Approval Banner */}
                    {booking.status === 'pending_approval' && (
                      <div className="mt-4 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                        <p className="text-amber-200 font-bold text-sm mb-2">⚠️ Quote Pending Approval</p>
                        <p className="text-white/80 text-xs mb-1"><strong>Diagnosis:</strong> {booking.diagnosis || 'Not provided'}</p>
                        <p className="text-white/80 text-xs mb-1"><strong>Parts Cost:</strong> ₹{booking.partsCost || 0}</p>
                        <p className="text-white font-bold text-lg mt-2">Total: ₹{booking.finalQuoteAmount}</p>

                        <div className="mt-3 p-3 bg-white/10 rounded-lg">
                          <p className="text-white/70 text-xs mb-1">Already Paid (Diagnostic): ₹{booking.amountPaid || booking.diagnosticFee}</p>
                          <p className="text-emerald-300 font-bold text-sm">
                            Remaining to Pay: ₹{booking.finalQuoteAmount - (booking.amountPaid || booking.diagnosticFee)}
                          </p>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => approveQuote(booking._id, true)}
                            className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
                          >
                            ✅ Approve & Pay ₹{booking.finalQuoteAmount - (booking.amountPaid || booking.diagnosticFee)}
                          </button>
                          <button
                            onClick={() => approveQuote(booking._id, false)}
                            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700"
                          >
                            ❌ Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show Uploaded Photos */}
                    {booking.photos && booking.photos.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-white/60 text-xs mb-3">{t('customer.issuePhotos')}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {booking.photos.map((photo: string, idx: number) => (
                            <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/20 hover:border-indigo-500 transition">
                              <img src={photo} alt={`Issue ${idx + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}


                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-white/60 text-xs mb-3">{t('customer.contactWorker')}</p>
                      <div className="flex gap-2">
                        <a href={`tel:${booking.workerId?.phone}`} className="flex-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600/30 transition flex items-center justify-center gap-2">{t('customer.call')}</a>
                        <a href={`https://wa.me/91${booking.workerId?.phone}?text=Hi ${booking.workerId?.name}, I booked you for ${booking.serviceId?.name}. Please confirm.`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-600/20 text-green-300 border border-green-500/30 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600/30 transition flex items-center justify-center gap-2">{t('customer.whatsapp')}</a>
                      </div>
                      <p className="text-white/40 text-xs mt-2 text-center">{t('customer.phoneLabel')}: {booking.workerId?.phone}</p>
                    </div>

                    <LiveTrackingMap
                      workerLocation={workerLocation}
                      customerLocation={customerLocation}
                      title=" Live Worker Location"
                    />

                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">{t('customer.tabHistory')}</h3>
            {historyBookings.length === 0 ? (
              <div className="text-center py-12"><div className="inline-block p-6 bg-white/5 rounded-full mb-4"><span className="text-6xl">📜</span></div><p className="text-white/60 text-lg">{t('customer.noPastBookings')}</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historyBookings.map((booking: any, index) => (
                  <motion.div key={booking._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-white text-lg">{booking.serviceId?.name}</h4>
                        <p className="text-white/60 text-sm">{t('customer.workerLabel')}: {booking.workerId?.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                          {booking.status === 'completed' ? t('customer.completed') : t('customer.cancelled')}
                        </span>
                        {booking.status === 'completed' && !booking.isReviewed && (
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedBookingForReview(booking); setShowReviewModal(true); }} className="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded-full hover:bg-yellow-500/30 transition">{t('customer.leaveReview')}</motion.button>
                        )}
                        {booking.isReviewed && <span className="text-xs text-white/40">{t('customer.reviewed')}</span>}
                      </div>
                    </div>
                    <p className="text-white/70 text-sm">📅 {new Date(booking.date).toLocaleString()}</p>
                    <p className="text-white font-bold text-2xl mt-3">₹{booking.totalAmount}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {showBookingModal && selectedWorker && selectedService && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/90 rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4 text-white">{t('customer.confirmBooking')}</h3>
              <p className="mb-2 text-white/80"><strong className="text-white">{t('customer.workerLabel')}:</strong> {selectedWorker.userId.name}</p>
              <p className="mb-4 text-white/80"><strong className="text-white">{t('customer.serviceLabel')}:</strong> {selectedService.name}</p>
              <label className="block mb-2 text-sm font-medium text-white/80">{t('customer.selectDateTime')}</label>
              <p className="text-indigo-300 text-xs mb-2">
                📅 Bookings allowed: Today (30 minutes later) to next 7 days
              </p>
              <input
                type="datetime-local"
                min={minDateTime}
                max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setBookingDate(e.target.value)}
              />
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 mb-6">
                <h4 className="font-bold text-white mb-4 text-center">{t('customer.pricingBreakdown')}</h4>
                <div className="mb-3"><div className="flex justify-between mb-1 text-sm"><span className="text-white/80">{t('customer.workerReceives')}</span><span className="text-white font-bold">80%</span></div><div className="w-full bg-white/10 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: '80%' }}></div></div></div>
                <div className="mb-3"><div className="flex justify-between mb-1 text-sm"><span className="text-white/80">{t('customer.welfareFund')}</span><span className="text-white font-bold">10%</span></div><div className="w-full bg-white/10 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{ width: '10%' }}></div></div></div>
                <div><div className="flex justify-between mb-1 text-sm"><span className="text-white/80">{t('customer.platformFee')}</span><span className="text-white font-bold">10%</span></div><div className="w-full bg-white/10 rounded-full h-2"><div className="bg-slate-500 h-2 rounded-full" style={{ width: '10%' }}></div></div></div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowBookingModal(false); setSelectedPhotos([]); }} className="px-4 py-2 text-white/70 hover:bg-white/10 rounded-xl transition">{t('customer.cancel')}</button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={confirmBooking} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg">{t('customer.confirmPay')}</motion.button>
              </div>

              {/* ✅ Integrated Photo Upload Section */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/60 text-xs text-center mb-3">{t('customer.uploadPhotosTip')}</p>
                <div className="flex flex-col items-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                    id="modal-photo-upload"
                  />
                  <label
                    htmlFor="modal-photo-upload"
                    className="cursor-pointer w-full bg-white/10 text-white py-2 rounded-xl text-sm hover:bg-white/20 transition flex items-center justify-center gap-2"
                  >
                    {uploadingPhoto ? t('customer.uploading') : '📸 Add Issue Photos'}
                  </label>

                  {/* Show thumbnails of selected photos */}
                  {selectedPhotos.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap justify-center">
                      {selectedPhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                          <img src={photo} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setSelectedPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showReviewModal && selectedBookingForReview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/90 rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-2 text-white">{t('customer.rateExperience')}</h3>
              <p className="text-white/60 text-sm mb-6">{t('customer.howWasService')} <strong className="text-white">{selectedBookingForReview.serviceId?.name}</strong> {t('customer.serviceBy')} {selectedBookingForReview.workerId?.name}?</p>
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setReviewRating(star)} className={`text-4xl transition transform hover:scale-110 ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>))}
              </div>
              <textarea placeholder={t('customer.writeComment')} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 mb-6 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowReviewModal(false)} className="px-4 py-2 text-white/70 hover:bg-white/10 rounded-xl transition">{t('customer.cancel')}</button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={submitReview} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 shadow-lg font-medium">{t('customer.submitReview')}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}


      </div>

      {/* Footer with Admin Contact */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 mb-8 pt-6 border-t border-white/20 text-center bg-black/30 backdrop-blur-md rounded-2xl p-6"
      >
        <p className="text-white/80 text-sm mb-2">{t('nav.supportPrompt')}</p>
        <a
          href="mailto:mdhruv6348@gmail.com"
          className="text-indigo-300 hover:text-white font-semibold transition flex items-center justify-center gap-2 text-lg"
        >
          <Mail className="w-5 h-5" /> mdhruv6348@gmail.com
        </a>
        <p className="text-white/50 text-xs mt-4">{t('nav.rights')}</p>
      </motion.footer>
    </div>


  );
}

// =================================================================
// WORKER DASHBOARD
// =================================================================
function WorkerDashboard({ token, language }: { token: string | null; language: 'en' | 'hi' }) {

  const { t } = useTranslation(language);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'welfare' | 'governance'>('pending');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedBookingForQuote, setSelectedBookingForQuote] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [partsCost, setPartsCost] = useState(0);
  const [proposals, setProposals] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const socketRef = useRef<any>(null);
  const trackingRef = useRef<number | NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchWorkerBookings();
    fetchProposals();
  }, []);
  useEffect(() => {
    socketRef.current = io(API_URL, { auth: { token } });
    return () => {
      // Clean up socket connection
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // Clean up simulation interval
      if (trackingRef.current) {
        navigator.geolocation.clearWatch(trackingRef.current as number);
      }
    };
  }, [token]);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}") as any;


  const fetchWorkerBookings = async () => {
    try { const res = await apiFetch(API_URL + "/api/bookings/worker-bookings", { headers: { "Authorization": `Bearer ${token}` } }); if (res.ok) setBookings(await res.json()); } catch (error) { console.error("Failed to fetch worker bookings"); }
  };
  const updateStatus = async (bookingId: string, newStatus: string) => {
    try { const res = await apiFetch(`${API_URL}/api/bookings/${bookingId}/status`, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ status: newStatus }) }); if (res.ok) fetchWorkerBookings(); } catch (error) { console.error("Failed to update status"); }
  };
  const submitQuote = async () => {
    try {
      const res = await apiFetch(`${API_URL}/api/bookings/${selectedBookingForQuote._id}/submit-quote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ diagnosis, partsCost: Number(partsCost) })
      });

      if (res.ok) {
        alert('Quote submitted! Waiting for customer approval.');
        setShowQuoteModal(false);
        setSelectedBookingForQuote(null);
        setDiagnosis('');
        setPartsCost(0);
        fetchWorkerBookings(); // Refresh bookings
      } else {
        const errorData = await res.json();
        alert(`Failed to submit quote: ${errorData.message || 'Unknown error'}`);
        console.error('Quote error:', errorData);
      }
    } catch (error) {
      console.error('Quote submission error:', error);
      alert('Something went wrong');
    }
  };
  const startRealTimeTracking = (bookingId: string) => {
    if (!navigator.geolocation) {
      alert("GPS is not supported by your browser");
      return;
    }

    setIsSimulating(true);
    alert("📍 Location tracking started! Customer can now see your location.");

    // Request real GPS position continuously
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        console.log('📍 Real GPS Location:', latitude.toFixed(6), longitude.toFixed(6));

        // Send REAL coordinates to server
        socketRef.current.emit('update_location', {
          bookingId,
          lat: latitude,
          lng: longitude
        });
      },
      (error) => {
        console.error('GPS Error:', error);
        alert("⚠️ Unable to get your location. Please enable GPS permissions.");
        setIsSimulating(false);
      },
      {
        enableHighAccuracy: true,  // Use GPS (not just WiFi)
        timeout: 10000,             // Wait up to 10 seconds
        maximumAge: 0               // Don't cache old positions
      }
    );

    // Store watchId to stop tracking later
    trackingRef.current = watchId;
  };

  const stopRealTimeTracking = () => {
    if (trackingRef.current) {
      navigator.geolocation.clearWatch(trackingRef.current as number);
      trackingRef.current = null;
      setIsSimulating(false);
      alert("🛑 Location tracking stopped");
    }
  };


  const fetchProposals = async () => {
    try {
      const res = await apiFetch(API_URL + "/api/proposals", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (error) {
      console.error("Failed to fetch proposals");
    }
  };

  const handleVote = async (proposalId: string, voteType: 'yes' | 'no') => {
    try {
      const res = await apiFetch(`${API_URL}/api/proposals/${proposalId}/vote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ voteType })
      });

      if (res.ok) {
        const updatedProposal = await res.json();
        setProposals(proposals.map((p: any) => p._id === proposalId ? updatedProposal : p));
        alert(`Vote recorded: ${voteType === 'yes' ? 'Yes' : 'No'}`);
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to vote");
      }
    } catch (error) {
      console.error('Vote error:', error);
      alert('Something went wrong while voting');
    }
  };

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalEarnings = completedBookings.reduce((sum, b) => sum + b.workerPayout, 0);
  const totalWelfareContribution = completedBookings.reduce((sum, b) => sum + b.cooperativeFundContribution, 0);
  const pendingBookings = bookings.filter(b =>
    b.status === 'pending' ||
    b.status === 'accepted' ||
    b.status === 'pending_approval' ||
    b.status === 'in_progress'
  );

  return (
    <div className="relative min-h-screen">
      <AdminBackground />
      <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{t('worker.dashboardTitle')}</h1>
            <p className="text-white/70">{t('worker.dashboardSubtitle')}</p>
          </div>
        </motion.div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center"><Briefcase className="w-6 h-6 text-white" /></div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-white/70 text-sm mb-1">{t('worker.totalEarnings')}</p>
            <p className="text-4xl font-bold text-white">₹{totalEarnings}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center"><CheckCircle className="w-6 h-6 text-white" /></div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-white/70 text-sm mb-1">{t('worker.jobsCompleted')}</p>
            <p className="text-4xl font-bold text-white">{completedBookings.length}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 rounded-2xl p-6 border-2 border-emerald-500/30 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center"><Shield className="w-6 h-6 text-white" /></div>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-emerald-200 text-sm mb-1">{t('worker.welfareFundLabel')}</p>
            <p className="text-4xl font-bold text-white">₹{totalWelfareContribution}</p>
            <div className="w-full bg-emerald-900/50 rounded-full h-2 mt-3"><div className="bg-emerald-400 h-2 rounded-full" style={{ width: '82%' }}></div></div>
            <p className="text-xs text-emerald-300 mt-1 font-medium">{t('worker.insuranceCoverage')}</p>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex gap-2 bg-white/5 backdrop-blur-lg p-2 rounded-2xl border border-white/10">
          <button onClick={() => setActiveTab('pending')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'pending' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            📋 {t('worker.activeJobs')}
          </button>
          <button onClick={() => setActiveTab('completed')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'completed' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            ✅ {t('worker.history')}
          </button>
          <button onClick={() => setActiveTab('welfare')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'welfare' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            🛡️ {t('worker.welfare')}
          </button>
          <button onClick={() => setActiveTab('governance')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'governance' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            🗳️ {t('worker.governance')}
          </button>
        </motion.div>

        {/* Tab Content Area */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl min-h-[400px]">

          {/* ACTIVE / PENDING JOBS TAB */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white mb-6">{t('worker.activeJobs')}</h3>
              {pendingBookings.length === 0 ? (
                <div className="text-center py-12"><div className="inline-block p-6 bg-white/5 rounded-full mb-4"><span className="text-6xl">☕</span></div><p className="text-white/60 text-lg">{t('worker.noActiveJobs')}</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingBookings.map((booking, index) => (
                    <motion.div key={booking._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-white text-lg">{booking.serviceId?.name}</h4>
                          <p className="text-white/60 text-sm">Customer: {booking.customerId?.name}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === 'accepted' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          booking.status === 'pending_approval' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            booking.status === 'in_progress' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                              'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                          {booking.status === 'accepted' ? '🚧 In Progress' : booking.status === 'pending_approval' ? '⏳ Quote Pending' : booking.status === 'in_progress' ? '🔧 Working' : '⏳ Pending'}
                        </span>
                      </div>

                      <p className="text-white/70 text-sm mb-4 flex items-center gap-1"><MapPin className="w-4 h-4" /> {booking.customerId?.address}</p>

                      {/* Photos */}
                      {booking.photos && booking.photos.length > 0 && (
                        <div className="mb-4 pb-4 border-b border-white/10">
                          <p className="text-white/60 text-xs mb-2 flex items-center gap-1"><Camera className="w-3 h-3" /> Issue Photos:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {booking.photos.map((photo: string, idx: number) => (
                              <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/20 hover:border-indigo-500 transition">
                                <img src={photo} alt={`Issue ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact */}
                      <div className="mb-4 pb-4 border-b border-white/10">
                        <p className="text-white/60 text-xs mb-2 flex items-center gap-1"><Phone className="w-3 h-3" /> Contact Customer:</p>
                        <div className="flex gap-2">
                          <a href={`tel:${booking.customerId?.phone}`} className="flex-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-600/30 transition flex items-center justify-center gap-1">📞 Call</a>
                          <a href={`https://wa.me/91${booking.customerId?.phone}?text=Hi ${booking.customerId?.name}, this is ${currentUser?.name} (your ${booking.serviceId?.name} worker).`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-600/20 text-green-300 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600/30 transition flex items-center justify-center gap-1">💬 WhatsApp</a>
                        </div>
                      </div>

                      <LiveTrackingMap
                        workerLocation={null}
                        customerLocation={{
                          lat: 20.2961, // Replace with actual customer coords
                          lng: 85.8245
                        }}
                        title=" 📍 Navigate to Customer "
                      />

                      {/* Action Buttons (Your exact logic, just styled better) */}
                      <div className="flex gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(booking._id, 'accepted')} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition">{t('worker.accept')}</button>
                            <button onClick={() => updateStatus(booking._id, 'cancelled')} className="flex-1 bg-white/10 text-white/70 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition">{t('worker.reject')}</button>
                          </>
                        )}
                        {booking.status === 'accepted' && (
                          <div className="space-y-2">
                            <button
                              onClick={() => { setSelectedBookingForQuote(booking); setShowQuoteModal(true); }}
                              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
                            >
                              Submit Final Quote
                            </button>
                            <button
                              onClick={() => isSimulating ? stopRealTimeTracking() : startRealTimeTracking(booking._id)}
                              className={`w-full py-2 rounded-lg text-sm font-medium text-white transition ${isSimulating
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                              {isSimulating ? '🛑 Stop Location Sharing' : '📍 Start Location Sharing'}
                            </button>
                          </div>
                        )}
                        {booking.status === 'pending_approval' && (
                          <div className="w-full bg-purple-500/20 text-purple-300 border border-purple-500/30 py-2 px-3 rounded-lg text-sm text-center font-medium">⏳ Awaiting Customer Approval</div>
                        )}
                        {booking.status === 'in_progress' && (
                          <button onClick={() => updateStatus(booking._id, 'completed')} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">{t('worker.markComplete')}</button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COMPLETED HISTORY TAB */}
          {activeTab === 'completed' && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white mb-6">{t('worker.completedHistory')}</h3>
              {completedBookings.length === 0 ? (
                <div className="text-center py-12"><div className="inline-block p-6 bg-white/5 rounded-full mb-4"><span className="text-6xl">📜</span></div><p className="text-white/60 text-lg">{t('worker.noCompletedJobs')}</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedBookings.map((booking, index) => (
                    <motion.div key={booking._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-lg">{booking.serviceId?.name}</p>
                        <p className="text-sm text-white/60">{t('worker.forLabel')}: {booking.customerId?.name}</p>
                        <p className="text-xs text-white/40 mt-1">{new Date(booking.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-400 text-lg">+₹{booking.workerPayout}</p>
                        <p className="text-xs text-purple-300 font-medium">{t('worker.fundLabel')}: +₹{booking.cooperativeFundContribution}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WELFARE TAB */}
          {activeTab === 'welfare' && (
            <div className="text-center py-12">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="inline-block p-6 bg-emerald-500/20 rounded-full mb-6 border border-emerald-500/30"><Shield className="w-16 h-16 text-emerald-400" /></motion.div>
              <h3 className="text-3xl font-bold text-white mb-4">{t('worker.welfareInsuranceTitle')}</h3>
              <p className="text-white/70 mt-2 max-w-2xl mx-auto text-lg">{t('worker.welfareDescription')}</p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-10 max-w-md mx-auto bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-2 border-emerald-500/30 p-8 rounded-2xl shadow-xl">
                <p className="text-emerald-200 text-sm mb-2">{t('worker.currentFundBalance')}</p>
                <p className="text-5xl font-bold text-white mb-6">₹{totalWelfareContribution}</p>
                <div className="w-full bg-emerald-900/50 rounded-full h-3 mb-2"><div className="bg-emerald-400 h-3 rounded-full" style={{ width: '82%' }}></div></div>
                <p className="text-xs text-emerald-300 mb-6">{t('worker.insuranceCoverage')}</p>
                <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg">{t('worker.viewInsuranceDetails')}</button>
              </motion.div>
            </div>
          )}

          {/* GOVERNANCE TAB */}
          {activeTab === 'governance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">{t('admin.cooperativeGovernance')}</h3>
                <div className="bg-indigo-500/20 border border-indigo-500/30 px-4 py-2 rounded-xl">
                  <p className="text-indigo-200 text-sm">{t('worker.voteMatters')}</p>
                </div>
              </div>

              {proposals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-block p-6 bg-white/5 rounded-full mb-4">
                    <Vote className="w-12 h-12 text-white/30" />
                  </div>
                  <p className="text-white/60 text-lg">{t('worker.noProposals')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {proposals.map((proposal, index) => (
                    <motion.div
                      key={proposal._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl p-6 border border-indigo-500/30"
                    >
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Vote className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-lg">{proposal.title}</h4>
                            <p className="text-white/60 text-sm mt-1">{t('admin.proposedBy')}: {proposal.proposedBy}</p>
                          </div>
                        </div>
                      </div>

                      {/* Voting Results */}
                      <div className="space-y-4 mb-6">
                        {/* YES Votes */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-emerald-300 font-medium">{t('admin.yes')}</span>
                            <span className="text-white font-bold">
                              {proposal.yesVotes + proposal.noVotes === 0 ? 0 : Math.round((proposal.yesVotes / (proposal.yesVotes + proposal.noVotes)) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${proposal.yesVotes + proposal.noVotes === 0 ? 0 : (proposal.yesVotes / (proposal.yesVotes + proposal.noVotes)) * 100}%`
                              }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                            />
                          </div>
                          <p className="text-white/60 text-xs mt-1">{proposal.yesVotes} {t('admin.votes')}</p>
                        </div>

                        {/* NO Votes */}
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-red-300 font-medium">{t('admin.no')}</span>
                            <span className="text-white font-bold">
                              {proposal.yesVotes + proposal.noVotes === 0 ? 0 : Math.round((proposal.noVotes / (proposal.yesVotes + proposal.noVotes)) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${proposal.yesVotes + proposal.noVotes === 0 ? 0 : (proposal.noVotes / (proposal.yesVotes + proposal.noVotes)) * 100}%`
                              }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full"
                            />
                          </div>
                          <p className="text-white/60 text-xs mt-1">{proposal.noVotes} {t('admin.votes')}</p>
                        </div>
                      </div>

                      {/* Vote Buttons */}
                      <div className="flex gap-3">
                        {(() => {
                          const hasVoted = proposal.voters?.includes(currentUser?._id);
                          return (
                            <>
                              <motion.button
                                whileHover={!hasVoted ? { scale: 1.05 } : {}}
                                whileTap={!hasVoted ? { scale: 0.95 } : {}}
                                onClick={() => !hasVoted && handleVote(proposal._id, 'yes')}
                                disabled={hasVoted}
                                className={`flex-1 py-3 rounded-xl font-medium shadow-lg transition ${hasVoted
                                  ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30'
                                  : 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700'
                                  }`}
                              >
                                {hasVoted ? `${t('admin.votedYes')} ✓` : t('admin.voteYes')}
                              </motion.button>

                              <motion.button
                                whileHover={!hasVoted ? { scale: 1.05 } : {}}
                                whileTap={!hasVoted ? { scale: 0.95 } : {}}
                                onClick={() => !hasVoted && handleVote(proposal._id, 'no')}
                                disabled={hasVoted}
                                className={`flex-1 py-3 rounded-xl font-medium shadow-lg transition ${hasVoted
                                  ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30'
                                  : 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700'
                                  }`}
                              >
                                {hasVoted ? `${t('admin.votedNo')} ✓` : t('admin.voteNo')}
                              </motion.button>
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

        </motion.div>
      </div>

      {/* Quote Submission Modal (Dark Theme to match app) */}
      {showQuoteModal && selectedBookingForQuote && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/90 rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-white">Submit Final Quote</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-white/80 mb-2">Diagnosis (What's the issue?)</label>
              <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g., Faulty capacitor in ceiling fan" className="w-full bg-white/10 border border-white/20 rounded-xl p-3 h-24 resize-none text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-white/80 mb-2">Parts Cost (₹)</label>
              <input type="number" value={partsCost} onChange={(e) => setPartsCost(Number(e.target.value))} placeholder="0" className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-white/50 mt-1">Diagnostic Fee: ₹{INSPECTION_FEE} (included)</p>
              <p className="text-sm font-bold text-indigo-400 mt-2">Total Quote: ₹{INSPECTION_FEE + Number(partsCost || 0)}</p>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowQuoteModal(false)} className="px-4 py-2 text-white/70 hover:bg-white/10 rounded-xl transition">Cancel</button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={submitQuote} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg">Send to Customer</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      {/* Footer with Admin Contact */}
      {/* Footer with Admin Contact */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 mb-8 pt-6 border-t border-white/20 text-center bg-black/30 backdrop-blur-md rounded-2xl p-6"
      >
        <p className="text-white/80 text-sm mb-2">{t('nav.supportPrompt')}</p>
        <a
          href="mailto:mdhruv6348@gmail.com"
          className="text-indigo-300 hover:text-white font-semibold transition flex items-center justify-center gap-2 text-lg"
        >
          <Mail className="w-5 h-5" /> mdhruv6348@gmail.com
        </a>
        <p className="text-white/50 text-xs mt-4">{t('nav.rights')}</p>
      </motion.footer>
    </div>

  );
}

// =================================================================
// ADMIN DASHBOARD
// =================================================================
function AdminDashboard({ token, handleLogout, language }: { token: string | null; handleLogout: () => void; language: 'en' | 'hi' }) {
  const { t } = useTranslation(language);
  const [workers, setWorkers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'verification' | 'governance' | 'analytics'>('verification');
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}") as any;
  const currentUserId = currentUser?._id;
  const [proposals, setProposals] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalWorkers: 0, totalCustomers: 0, totalBookings: 0, totalWelfare: 0 });

  useEffect(() => {
    if (activeTab === 'verification') fetchWorkers();
    if (activeTab === 'governance') fetchProposals();
    if (activeTab === 'analytics') fetchStats();
  }, [activeTab]);

  const fetchStats = async () => { try { const res = await apiFetch(API_URL + "/api/admin/stats", { headers: { "Authorization": `Bearer ${token}` } }); if (res.ok) setStats(await res.json()); } catch (error) { console.error("Failed to fetch stats"); } };
  const fetchProposals = async () => { try { const res = await apiFetch(API_URL + "/api/proposals", { headers: { "Authorization": `Bearer ${token}` } }); if (res.ok) setProposals(await res.json()); } catch (error) { console.error("Failed to fetch proposals"); } };
  const handleAddProposal = async () => {
    const newTitle = prompt("Enter the new proposal topic:");
    if (newTitle) { try { const res = await apiFetch(API_URL + "/api/proposals", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ title: newTitle }) }); if (res.ok) { const newProposal = await res.json(); setProposals([newProposal, ...proposals]); } } catch (error) { alert("Failed to create proposal"); } }
  };
  const handleRemoveProposal = async (id: string) => {
    if (window.confirm("Are you sure?")) { try { const res = await apiFetch(`${API_URL}/api/proposals/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } }); if (res.ok) setProposals(proposals.filter((p: any) => p._id !== id)); } catch (error) { alert("Failed to delete proposal"); } }
  };
  const handleVote = async (proposalId: string, voteType: 'yes' | 'no') => {
    try { const res = await apiFetch(`${API_URL}/api/proposals/${proposalId}/vote`, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ voteType }) }); if (res.ok) { const updatedProposal = await res.json(); setProposals(proposals.map((p: any) => p._id === proposalId ? updatedProposal : p)); } else { const data = await res.json(); alert(data.message || "Failed to register vote"); } } catch (error) { console.error("Vote error:", error); alert("Something went wrong while voting"); }
  };
  const fetchWorkers = async () => { try { const res = await apiFetch(API_URL + "/api/admin/workers", { headers: { "Authorization": `Bearer ${token}` } }); if (res.ok) setWorkers(await res.json()); } catch (error) { console.error("Failed to fetch"); } };
  const handleVerify = async (workerId: string, status: boolean) => { try { const res = await apiFetch(`${API_URL}/api/admin/workers/${workerId}/verify`, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ isVerified: status }) }); if (res.ok) fetchWorkers(); } catch (error) { console.error("Failed to update"); } };

  return (
    <div className="relative min-h-screen">
      <AdminBackground />
      <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div><h1 className="text-4xl font-bold text-white mb-2">{t('admin.superAdminDashboard')}</h1><p className="text-white/70">{t('admin.ncctSubtitle')}</p></div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-4"><div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div><TrendingUp className="w-5 h-5 text-green-400" /></div>
            <p className="text-white/70 text-sm mb-1">{t('admin.totalMembers')}</p><p className="text-4xl font-bold text-white">{workers.length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-4"><div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-white" /></div><TrendingUp className="w-5 h-5 text-green-400" /></div>
            <p className="text-white/70 text-sm mb-1">{t('admin.verifiedWorkers')}</p><p className="text-4xl font-bold text-white">{workers.filter(w => w.isVerified).length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-4"><div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div><TrendingUp className="w-5 h-5 text-amber-400" /></div>
            <p className="text-white/70 text-sm mb-1">{t('admin.pendingApprovals')}</p><p className="text-4xl font-bold text-white">{workers.filter(w => !w.isVerified).length}</p>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex gap-2 mb-6 bg-white/5 backdrop-blur-sm p-2 rounded-2xl border border-white/10">
          <button onClick={() => setActiveTab('verification')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'verification' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>{t('admin.workerVerification')}</button>
          <button onClick={() => setActiveTab('governance')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'governance' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>{t('admin.governance')}</button>
          <button onClick={() => setActiveTab('analytics')} className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${activeTab === 'analytics' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>{t('admin.analytics')}</button>
        </motion.div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {activeTab === 'verification' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-6">{t('admin.workerVerification')}</h3>
              {workers.length === 0 ? (<div className="text-center py-12"><Users className="w-16 h-16 text-white/30 mx-auto mb-4" /><p className="text-white/60">{t('admin.noWorkersRegistered')}</p></div>) : (
                <div className="space-y-4">
                  {workers.map((worker, index) => (
                    <motion.div key={worker._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">{worker.userId?.name?.charAt(0) || 'W'}</div>
                          <div><p className="text-white font-semibold text-lg">{worker.userId?.name}</p><p className="text-white/60 text-sm">{worker.userId?.email}</p><p className="text-white/40 text-xs mt-1">{t('admin.skillsLabel')}: {worker.skills?.join(', ') || t('admin.none')}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-4 py-2 rounded-full text-sm font-medium ${worker.isVerified ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>{worker.isVerified ? t('admin.verified') : t('admin.pending')}</span>
                          <div className="flex gap-2">
                            {!worker.isVerified ? (<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleVerify(worker._id, true)} className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-emerald-700 hover:to-green-700 shadow-lg">{t('admin.approve')}</motion.button>) : (<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleVerify(worker._id, false)} className="bg-white/10 text-white/70 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 border border-white/20">{t('admin.revoke')}</motion.button>)}
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={async () => { const currentSkills = worker.skills ? worker.skills.join(', ') : ""; const newSkills = prompt("Enter new skills separated by comma:", currentSkills); if (newSkills !== null) { const skillsArray = newSkills.split(',').map((s: string) => s.trim()); const res = await apiFetch(`${API_URL}/api/admin/workers/${worker._id}/update-skills`, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ skills: skillsArray }) }); if (res.ok) { alert("Skills updated!"); fetchWorkers(); } } }} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-lg">{t('admin.editSkills')}</motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'governance' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">{t('admin.cooperativeGovernance')}</h3>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddProposal} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2">{t('admin.createProposal')}</motion.button>
              </div>
              <div className="space-y-6">
                {proposals.map((proposal) => (
                  <motion.div key={proposal._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl p-6 border border-indigo-500/30">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0"><Vote className="w-6 h-6 text-white" /></div>
                        <div><h4 className="text-white font-bold text-lg">{proposal.title}</h4><p className="text-white/60 text-sm mt-1">{t('admin.proposedBy')}: {proposal.proposedBy}</p></div>
                      </div>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleRemoveProposal(proposal._id)} className="bg-red-500/20 text-red-300 p-2.5 rounded-xl hover:bg-red-500/30 border border-red-500/30 transition group" title="Remove Proposal"><svg className="w-5 h-5 group-hover:text-red-200 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></motion.button>
                    </div>
                    <div className="space-y-4 mb-6">
                      <div>
                        <div className="flex justify-between mb-2"><span className="text-emerald-300 font-medium">{t('admin.yes')}</span><span className="text-white font-bold">{proposal.yesVotes + proposal.noVotes === 0 ? 0 : Math.round((proposal.yesVotes / (proposal.yesVotes + proposal.noVotes)) * 100)}%</span></div>
                        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${proposal.yesVotes + proposal.noVotes === 0 ? 0 : (proposal.yesVotes / (proposal.yesVotes + proposal.noVotes)) * 100}%` }} transition={{ duration: 0.5, ease: "easeOut" }} className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full" /></div>
                        <p className="text-white/60 text-xs mt-1">{proposal.yesVotes} {t('admin.votes')}</p>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2"><span className="text-red-300 font-medium">{t('admin.no')}</span><span className="text-white font-bold">{proposal.yesVotes + proposal.noVotes === 0 ? 0 : Math.round((proposal.noVotes / (proposal.yesVotes + proposal.noVotes)) * 100)}%</span></div>
                        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${proposal.yesVotes + proposal.noVotes === 0 ? 0 : (proposal.noVotes / (proposal.yesVotes + proposal.noVotes)) * 100}%` }} transition={{ duration: 0.5, ease: "easeOut" }} className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full" /></div>
                        <p className="text-white/60 text-xs mt-1">{proposal.noVotes} {t('admin.votes')}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {(() => {
                        const hasVoted = proposal.voters?.includes(currentUserId);
                        return (<><motion.button whileHover={!hasVoted ? { scale: 1.05 } : {}} whileTap={!hasVoted ? { scale: 0.95 } : {}} onClick={() => !hasVoted && handleVote(proposal._id, 'yes')} disabled={hasVoted} className={`flex-1 py-3 rounded-xl font-medium shadow-lg transition ${hasVoted ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700'}`}>{hasVoted ? t('admin.votedYes') : t('admin.voteYes')}</motion.button><motion.button whileHover={!hasVoted ? { scale: 1.05 } : {}} whileTap={!hasVoted ? { scale: 0.95 } : {}} onClick={() => !hasVoted && handleVote(proposal._id, 'no')} disabled={hasVoted} className={`flex-1 py-3 rounded-xl font-medium shadow-lg transition ${hasVoted ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700'}`}>{hasVoted ? t('admin.votedNo') : t('admin.voteNo')}</motion.button></>);
                      })()}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-6">{t('admin.platformAnalytics')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-xl p-6 border border-blue-500/30"><BarChart3 className="w-8 h-8 text-blue-400 mb-4" /><p className="text-white/70 text-sm mb-2">{t('admin.totalBookings')}</p><p className="text-4xl font-bold text-white">{stats.totalBookings}</p></motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 border border-purple-500/30"><TrendingUp className="w-8 h-8 text-purple-400 mb-4" /><p className="text-white/70 text-sm mb-2">{t('admin.totalWelfareGenerated')}</p><p className="text-4xl font-bold text-white">₹ {stats.totalWelfare}</p></motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 rounded-xl p-6 border border-emerald-500/30"><ShieldCheck className="w-8 h-8 text-emerald-400 mb-4" /><p className="text-white/70 text-sm mb-2">{t('admin.registeredWorkers')}</p><p className="text-4xl font-bold text-white">{stats.totalWorkers}</p></motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-xl p-6 border border-amber-500/30"><Users className="w-8 h-8 text-amber-400 mb-4" /><p className="text-white/70 text-sm mb-2">{t('admin.registeredCustomers')}</p><p className="text-4xl font-bold text-white">{stats.totalCustomers}</p></motion.div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}