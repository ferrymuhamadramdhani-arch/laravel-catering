import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  ShoppingBag,
  Users,
  ChefHat,
  Eye,
} from 'lucide-react';
import type { CalendarDaySummary, Order, OrderStatus } from '../../types/order';

interface OrderCalendarViewProps {
  onSelectOrder: (orderId: number) => void;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const STATUS_COLOR_MAP: Record<OrderStatus, string> = {
  draft: 'bg-slate-200 text-slate-700',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  in_production: 'bg-amber-100 text-amber-800 border-amber-200',
  ready: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivering: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-teal-100 text-teal-800 border-teal-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export const OrderCalendarView: React.FC<OrderCalendarViewProps> = ({ onSelectOrder }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, CalendarDaySummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/tenant/orders/calendar', {
        params: {
          month: currentMonth,
          year: currentYear,
        },
      });
      setCalendarData(res.data.data?.days || {});
    } catch (err: any) {
      console.error('Fetch calendar error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 2, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  // Build calendar matrix
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  const totalSlots = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const calendarDays = [];
  for (let i = 0; i < totalSlots; i++) {
    if (i < firstDayIndex) {
      // Prev month trailing days
      const dayNum = daysInPrevMonth - firstDayIndex + i + 1;
      calendarDays.push({ dayNum, isCurrentMonth: false, dateStr: '' });
    } else if (i < firstDayIndex + daysInMonth) {
      // Current month days
      const dayNum = i - firstDayIndex + 1;
      const monthStr = String(currentMonth).padStart(2, '0');
      const dayStr = String(dayNum).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      calendarDays.push({ dayNum, isCurrentMonth: true, dateStr });
    } else {
      // Next month trailing days
      const dayNum = i - (firstDayIndex + daysInMonth) + 1;
      calendarDays.push({ dayNum, isCurrentMonth: false, dateStr: '' });
    }
  }

  const selectedDayData = selectedDay ? calendarData[selectedDay] : null;

  return (
    <div className="space-y-4">
      {/* Calendar Top Navigation Header */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center border border-amber-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau jadwal pengiriman dan kapasitas porsi harian dapur katering
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs font-semibold">
            Hari Ini
          </Button>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Main Grid View & Day Details Sidepanel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Calendar Grid (8 or 12 cols) */}
        <Card className={`p-0 overflow-hidden ${selectedDayData ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 uppercase py-2.5">
            {DAY_NAMES.map((d, idx) => (
              <div key={d} className={idx === 0 || idx === 6 ? 'text-red-500' : ''}>
                {d}
              </div>
            ))}
          </div>

          {/* Days Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/30">
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[110px] p-2 bg-slate-50/40 text-slate-300 text-xs font-medium"
                  >
                    {item.dayNum}
                  </div>
                );
              }

              const dayData = calendarData[item.dateStr];
              const isToday = new Date().toISOString().split('T')[0] === item.dateStr;
              const isSelected = selectedDay === item.dateStr;

              return (
                <div
                  key={item.dateStr}
                  onClick={() => setSelectedDay(item.dateStr)}
                  className={`min-h-[110px] p-2 bg-white flex flex-col justify-between transition-all cursor-pointer hover:bg-amber-50/40 ${
                    isSelected
                      ? 'ring-2 ring-amber-500 bg-amber-50/30 z-10'
                      : ''
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-amber-600 text-white font-extrabold shadow-2xs'
                          : 'text-slate-800'
                      }`}
                    >
                      {item.dayNum}
                    </span>

                    {dayData && dayData.total_portions > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          dayData.total_portions > 300
                            ? 'bg-red-100 text-red-800'
                            : dayData.total_portions > 100
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                        title="Total Porsi Dapur"
                      >
                        {dayData.total_portions} pax
                      </span>
                    )}
                  </div>

                  {/* Day Orders Chips */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {dayData?.orders.slice(0, 2).map((ord) => (
                      <div
                        key={ord.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(ord.id);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium border truncate transition-opacity hover:opacity-80 flex items-center gap-1 ${
                          STATUS_COLOR_MAP[ord.status] || 'bg-slate-100 text-slate-700'
                        }`}
                        title={`${ord.order_number}: ${ord.customer_name} (${ord.event_type})`}
                      >
                        <span className="font-bold">{ord.delivery_time ? ord.delivery_time.slice(0, 5) : '•'}</span>
                        <span className="truncate">{ord.customer_name}</span>
                      </div>
                    ))}

                    {dayData && dayData.orders.length > 2 && (
                      <span className="text-[10px] text-slate-400 font-semibold block text-center">
                        +{dayData.orders.length - 2} pesanan lagi
                      </span>
                    )}
                  </div>

                  {/* Day Footer info */}
                  {dayData ? (
                    <div className="text-[10px] text-slate-500 font-medium text-right pt-1 border-t border-slate-100">
                      <strong>{dayData.total_orders}</strong> order
                    </div>
                  ) : (
                    <div className="h-3" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Selected Day Order List Drawer / Panel */}
        {selectedDayData && (
          <Card className="lg:col-span-4 p-5 space-y-4 shadow-md sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">
                  Jadwal Pesanan
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {new Date(selectedDay!).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Daily Kitchen Metrics */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Pesanan</span>
                <span className="text-base font-extrabold text-slate-800">
                  {selectedDayData.total_orders} Order
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Beban Dapur (Pax)</span>
                <span className="text-base font-extrabold text-amber-600 flex items-center justify-center gap-1">
                  <ChefHat className="w-4 h-4" /> {selectedDayData.total_portions} Porsi
                </span>
              </div>
            </div>

            {/* List of Orders on Selected Day */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {selectedDayData.orders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(ord.id)}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-amber-700">
                      {ord.order_number}
                    </span>
                    <Badge variant="outline" className={`text-[10px] font-semibold ${STATUS_COLOR_MAP[ord.status]}`}>
                      {ord.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 text-xs">{ord.customer_name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ord.event_name || ord.event_type}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {ord.delivery_time ? ord.delivery_time.slice(0, 5) : '—'}
                    </span>
                    <span className="font-bold text-slate-800">{ord.total_pax} porsi</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
