import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border/10 px-6 py-10 text-body-sm t-text-secondary">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-start gap-8 md:gap-12">
        <div className="space-y-2 md:flex-1">
          <p className="font-bold text-teal-400">TiffinPoint</p>
          <p className="opacity-70">Freshly cooked tiffin meals, delivered daily across Delhi NCR.</p>
          <p className="opacity-50 text-[11px] pt-2">© {year} TiffinPoint Services. All rights reserved.</p>
        </div>

        <div className="space-y-2">
          <p className="font-bold text-teal-400 uppercase tracking-widest text-[10px]">Legal</p>
          <ul className="space-y-1">
            <li><Link to="/privacy" className="hover:text-teal-400">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-teal-400">Terms of Service</Link></li>
            <li><Link to="/refund" className="hover:text-teal-400">Refund Policy</Link></li>
            <li><Link to="/shipping" className="hover:text-teal-400">Shipping &amp; Delivery</Link></li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-bold text-teal-400 uppercase tracking-widest text-[10px]">Company</p>
          <ul className="space-y-1">
            <li><Link to="/contact" className="hover:text-teal-400">Contact Us</Link></li>
            <li><a href="mailto:info@mypinnakle.com" className="hover:text-teal-400">info@mypinnakle.com</a></li>
            <li><a href="tel:+918901221068" className="hover:text-teal-400">+91-8901221068</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
