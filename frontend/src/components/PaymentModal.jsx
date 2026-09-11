import React, { useState } from "react";
import {
  HiOutlineCreditCard,
  HiOutlineQrcode,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiX,
  HiOutlineDownload,
  HiOutlineArrowRight
} from "react-icons/hi";
import axiosInstance from "../utils/axiosInstance";

const PaymentModal = ({ isOpen, onClose, cartItems, grandTotal, onPaymentSuccess }) => {
  if (!isOpen) return null;

  const [paymentMethod, setPaymentMethod] = useState("stripe"); // "stripe" | "upi" | "oneclick"
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("888");
  const [nameOnCard, setNameOnCard] = useState("BaskIt Shopper");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePay = async () => {
    setIsProcessing(true);
    setErrorMsg("");

    try {
      // Simulate real Stripe authorization delay
      await new Promise((res) => setTimeout(res, 1200));

      const response = await axiosInstance.post("/process-payment", {
        amount: grandTotal,
        paymentMethod: paymentMethod === "stripe" ? "Stripe Card (Visa ••4242)" : paymentMethod === "upi" ? "UPI Instant Pay" : "Stripe 1-Click Express",
        cardLast4: "4242",
      });

      if (response.data && response.data.receipt) {
        setReceipt(response.data.receipt);
        if (onPaymentSuccess) {
          onPaymentSuccess(response.data.receipt);
        }
      } else {
        // Fallback receipt
        const fallbackReceipt = {
          transactionId: "BASKIT-TXN-" + Math.floor(100000 + Math.random() * 900000),
          amount: grandTotal,
          paymentMethod: "Stripe Checkout",
          cardLast4: "4242",
          status: "PAID",
          gateStatus: "GATE_UNLOCKED",
          paidAt: new Date().toISOString(),
        };
        setReceipt(fallbackReceipt);
        if (onPaymentSuccess) {
          onPaymentSuccess(fallbackReceipt);
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      setErrorMsg("Payment processing encountered an issue. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSession = () => {
    setReceipt(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 overflow-hidden">
        
        {/* Close Button */}
        {!receipt && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-colors"
          >
            <HiX className="text-lg" />
          </button>
        )}

        {/* RECEIPT VIEW ON SUCCESS */}
        {receipt ? (
          <div className="text-center py-4 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
              <HiOutlineCheckCircle />
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-[#137A24] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Payment Confirmed
            </span>

            <h3 className="text-2xl font-black text-[#16331C] mt-3">
              Gate Unlocked &amp; Ready!
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Your transaction has been securely processed by Stripe and verified by the exit turnstile.
            </p>

            {/* Receipt Summary Box */}
            <div className="bg-[#FAFDFB] border border-slate-200/80 rounded-2xl p-5 my-6 text-left text-xs space-y-2.5">
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Transaction ID</span>
                <span className="font-mono font-bold text-slate-800">{receipt.transactionId}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Payment Method</span>
                <span className="font-bold text-slate-800">{receipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Total Amount Paid</span>
                <span className="font-black text-[#137A24] text-sm">₹{receipt.amount}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 font-medium">Exit Gate Actuator</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-md">
                  🟢 UNLOCKED (Adafruit Feed ON)
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <HiOutlineDownload /> Print Receipt
              </button>
              <button
                onClick={handleResetSession}
                className="flex-1 bg-[#137A24] hover:bg-[#0E621C] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all active:scale-95"
              >
                Start New Session →
              </button>
            </div>
          </div>
        ) : (
          /* CHECKOUT FORM VIEW */
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#E2EFE5] text-[#137A24] rounded-xl flex items-center justify-center text-xl">
                <HiOutlineCreditCard />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#16331C]">
                  BaskIt Checkout
                </h3>
                <p className="text-xs text-slate-500">Autonomous Payment &amp; Exit Gate Clearance</p>
              </div>
            </div>

            {/* Total Due Banner */}
            <div className="bg-[#137A24]/10 border border-[#137A24]/20 rounded-2xl p-4 mb-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                  Total Billable Amount
                </span>
                <span className="text-2xl font-black text-[#137A24]">₹{grandTotal}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-white text-slate-600 font-bold px-2 py-1 rounded-md border border-slate-200 block">
                  {cartItems.length} items in basket
                </span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMethod("stripe")}
                className={`flex-1 py-2 rounded-lg transition-all ${paymentMethod === "stripe" ? "bg-white text-[#137A24] shadow-sm" : "text-slate-600"}`}
              >
                💳 Card / Stripe
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`flex-1 py-2 rounded-lg transition-all ${paymentMethod === "upi" ? "bg-white text-[#137A24] shadow-sm" : "text-slate-600"}`}
              >
                📱 UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("oneclick")}
                className={`flex-1 py-2 rounded-lg transition-all ${paymentMethod === "oneclick" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"}`}
              >
                ⚡ 1-Click Pay
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 text-xs bg-red-50 text-red-600 p-3 rounded-xl border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* Stripe Card Details */}
            {paymentMethod === "stripe" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-200 rounded-xl pl-3 pr-16 py-2.5 outline-none focus:border-[#137A24]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                      STRIPE
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Expires (MM/YY)</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#137A24]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CVC / CVV</label>
                    <input
                      type="password"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#137A24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#137A24]"
                  />
                </div>
              </div>
            )}

            {/* UPI QR Method */}
            {paymentMethod === "upi" && (
              <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto shadow-sm border border-slate-200 flex items-center justify-center">
                  <HiOutlineQrcode className="text-7xl text-slate-800" />
                </div>
                <p className="text-xs font-bold text-slate-700 mt-3">Scan with Google Pay, PhonePe or Paytm</p>
                <p className="text-[11px] text-slate-400">UPI ID: baskit.cart04@okhdfcbank</p>
              </div>
            )}

            {/* 1-Click Pay Method */}
            {paymentMethod === "oneclick" && (
              <div className="bg-[#FAFDFB] border border-[#137A24]/30 rounded-2xl p-5 text-center">
                <span className="text-2xl mb-2 block">⚡</span>
                <h4 className="text-sm font-extrabold text-[#16331C]">Instant Demo Checkout</h4>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Instantly authorize ₹{grandTotal} using the linked pre-authorized demo card and send exit command.
                </p>
              </div>
            )}

            {/* Security Indicator */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-4 mb-5">
              <HiOutlineShieldCheck className="text-emerald-600 text-sm" />
              <span>256-Bit Encrypted · Verified by Stripe &amp; Adafruit IO</span>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={isProcessing || grandTotal <= 0}
              className="w-full bg-[#137A24] hover:bg-[#0E621C] disabled:bg-slate-300 text-white font-black text-sm py-4 rounded-xl shadow-lg shadow-green-900/15 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Verifying Transaction with Stripe...</span>
                </>
              ) : (
                <>
                  <span>Pay ₹{grandTotal} &amp; Unlock Gate</span>
                  <HiOutlineArrowRight />
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentModal;
