import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import './DisplayScreen.css';

const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const normalize = (val) => String(val ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

function parseDate(value) {
  const text = String(value ?? '').trim();
  let match = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (match) return new Date(+match[3], +match[2] - 1, +match[1]);
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return match ? new Date(+match[1], +match[2] - 1, +match[3]) : null;
}

function sameDay(first, second) {
  return first && second && first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

function normalizeTime(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  return match ? `${pad(+match[1])}:${match[2]}` : text;
}

function parseCsv(text) {
  const output = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); output.push(row); row = []; field = '';
    } else field += char;
  }
  if (field !== '' || row.length) { row.push(field); output.push(row); }
  return output;
}

const DEFAULT_ROWS = [
  { stt: 1, ngay: '', kh: 'Anh Hoàng Nam', bs: '15A-899.23', xe: 'Kia Carnival', gio: '08:30', nd: 'Bảo dưỡng định kỳ 20.000km', tv: 'Nguyễn Văn Minh' },
  { stt: 2, ngay: '', kh: 'Chị Mai Linh', bs: '15K-123.45', xe: 'Mazda CX-5', gio: '09:00', nd: 'Kiểm tra hệ thống điều hòa', tv: 'Lê Thu Hương' },
  { stt: 3, ngay: '', kh: 'Anh Tuấn Anh', bs: '15A-678.90', xe: 'Peugeot 3008', gio: '09:30', nd: 'Thay dầu nhớt động cơ', tv: 'Phạm Đức Thành' },
  { stt: 4, ngay: '', kh: 'Bác Trần Văn Hưng', bs: '15B-345.67', xe: 'Kia Seltos', gio: '10:00', nd: 'Cân bằng động và chỉnh góc lái', tv: 'Nguyễn Văn Minh' },
  { stt: 5, ngay: '', kh: 'Anh Lê Quang Huy', bs: '15A-456.78', xe: 'Mazda 3', gio: '10:30', nd: 'Bảo dưỡng cấp trung bình', tv: 'Trần Thị Bình' },
  { stt: 6, ngay: '', kh: 'Chị Đặng Thảo', bs: '15K-999.88', xe: 'Kia K5', gio: '11:00', nd: 'Kiểm tra gầm và phanh', tv: 'Lê Thu Hương' }
];

export default function DisplayScreen() {
  const { slug } = useParams();
  const [config, setConfig] = useState(null);
  const [allRows, setAllRows] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(6);
  const [loadError, setLoadError] = useState('');
  const [statusDotColor, setStatusDotColor] = useState('#f9a825');
  const [statusDotTitle, setStatusDotTitle] = useState('Đang khởi tạo');
  const [animClass, setAnimClass] = useState('slide-in');

  const bodyRef = useRef(null);
  const rootRef = useRef(null);

  // 1. Fetch Configuration
  useEffect(() => {
    setIsDataLoading(true);
    async function loadConfig() {
      try {
        const data = await api.get(`/screens/${slug}`);
        setConfig(data);
        document.title = `${data.name} | THACO AUTO`;
      } catch (err) {
        setLoadError('Không tìm thấy cấu hình màn hình: ' + err.message);
        setStatusDotColor('#c62828');
        setStatusDotTitle('Lỗi cấu hình');
        setIsDataLoading(false);
      }
    }
    loadConfig();
    const interval = setInterval(loadConfig, 10000);
    return () => clearInterval(interval);
  }, [slug]);

  // 2. Fetch Google Sheet Data
  useEffect(() => {
    if (!config) return;

    let isMounted = true;
    async function fetchSheet() {
      const sheetUrl = config.sheet_url || config.sheetUrl || '';
      if (!sheetUrl.trim()) {
        if (isMounted) {
          setAllRows(DEFAULT_ROWS);
          setStatusDotColor('#2e7d32');
          setStatusDotTitle('Hiển thị dữ liệu tiếp nhận dịch vụ');
          setIsDataLoading(false);
        }
        return;
      }

      try {
        let url = sheetUrl.trim();
        const match = url.match(/\/spreadsheets\/d\/(?:e\/)?([^/?#]+)/);
        if (match && !/\/pub\?|output=csv/.test(url)) {
          url = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(config.sheet_name || config.sheetName || '')}`;
        }

        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const table = parseCsv(text).filter(r => r.some(c => c.trim()));
        if (!table.length) throw new Error('Sheet rỗng');

        const headings = table[0].map(normalize);
        const findIndex = (keys, fallback) => {
          const idx = headings.findIndex(h => keys.some(k => h.includes(k)));
          return idx >= 0 ? idx : fallback;
        };

        const idxs = {
          ngay: findIndex(['ngay'], 0),
          stt: findIndex(['stt'], 1),
          kh: findIndex(['khach'], 2),
          bs: findIndex(['bien'], 3),
          xe: findIndex(['mau'], 4),
          gio: findIndex(['thoi gian', 'gio'], 5),
          nd: findIndex(['noi dung', 'cong viec'], 6),
          tv: findIndex(['tu van', 'dich vu'], 7)
        };

        const parsed = table.slice(1).map(row => {
          const get = k => (row[idxs[k]] || '').trim();
          return {
            ngay: get('ngay'),
            stt: get('stt'),
            kh: get('kh'),
            bs: get('bs'),
            xe: get('xe'),
            gio: normalizeTime(get('gio')),
            nd: get('nd'),
            tv: get('tv')
          };
        }).filter(r => r.kh || r.bs);

        if (isMounted) {
          setAllRows(parsed);
          setLoadError('');
          setStatusDotColor('#2e7d32');
          setStatusDotTitle(`Đồng bộ lúc ${new Date().toLocaleTimeString('vi-VN')}`);
        }
      } catch (err) {
        console.warn('Sheet load error:', err);
        if (isMounted) {
          setAllRows([]);
          setLoadError(`${config.load_error_message || config.loadErrorMessage}: ${err.message}`);
          setStatusDotColor('#c62828');
          setStatusDotTitle(err.message);
        }
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    }

    fetchSheet();
    const refreshSec = Math.max(10, Number(config.refresh_sec || config.refresh) || 60);
    const timer = setInterval(fetchSheet, refreshSec * 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [config]);

  // 3. Layout Dimensions & Dynamic Page Size Calculation (Responsive for TV, Laptops, Tablets, Phones)
  useEffect(() => {
    function recalc() {
      if (!bodyRef.current || !config || !rootRef.current) return;
      const width = window.innerWidth;
      const bodyHeight = bodyRef.current.clientHeight || 500;

      // Scale factor for smaller screens
      let scale = 1;
      if (width < 600) scale = 0.52;
      else if (width < 900) scale = 0.68;
      else if (width < 1200) scale = 0.82;
      else if (width < 1440) scale = 0.92;

      const calculatedSize = config.mode === 'fixed'
        ? Math.max(1, Number(config.page_size || config.pageSize) || 6)
        : Math.max(1, Math.floor(bodyHeight / Math.max(55, Number(config.min_row_h || config.minRowH) || 70)));

      const rowHeight = width < 580 ? 52 : (bodyHeight / calculatedSize);
      const headingFontSize = width < 580 ? 12 : Math.min(bodyHeight * 0.045, width * 0.016);

      const baseTitle = Number(config.title_font_size || config.titleFontSize) || 48;
      const baseDate = Number(config.date_font_size || config.dateFontSize) || 31;
      const baseData = Number(config.data_font_size || config.dataFontSize) || 24;

      // Font chữ nội dung được giới hạn tự động theo chiều cao của hàng để không bao giờ bị đè chữ
      const maxDataFont = Math.max(12, Math.floor(rowHeight * 0.28));
      const scaledData = Math.round(baseData * scale);
      const finalDataFont = Math.max(12, Math.min(scaledData, maxDataFont));

      const style = rootRef.current.style;
      style.setProperty('--row-height', `${rowHeight}px`);
      style.setProperty('--heading-font-size', `${Math.max(11, Math.round(headingFontSize * scale))}px`);
      style.setProperty('--head-color', config.color_head || config.colorHead || '#4472c4');
      style.setProperty('--row-color-1', config.color1 || '#cfd5ea');
      style.setProperty('--row-color-2', config.color2 || '#e9ebf5');
      style.setProperty('--text-color', config.color_text || config.colorText || '#00529c');
      style.setProperty('--title-color', config.color_title || config.colorTitle || '#ff0000');
      style.setProperty('--title-font-size', `${Math.max(18, Math.round(baseTitle * scale))}px`);
      style.setProperty('--date-font-size', `${Math.max(13, Math.round(baseDate * scale))}px`);
      style.setProperty('--data-font-size', `${finalDataFont}px`);

      setPageSize(calculatedSize);
    }

    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [config]);

  // 4. Filtering and Sorting Rows
  const getFilteredRows = () => {
    if (!config) return { list: [], target: new Date() };
    let list = allRows.slice();
    let target = null;
    const dateMode = config.date_mode || config.dateMode || 'today';
    const fixedDate = config.fixed_date || config.date || '';

    if (dateMode === 'today') target = new Date();
    else if (dateMode === 'date') target = parseDate(fixedDate);

    if (target) {
      list = list.filter(row => {
        const date = parseDate(row.ngay);
        return !date || sameDay(date, target);
      });
    }

    const sortTime = config.sort_time !== undefined ? config.sort_time : config.sortTime;
    if (sortTime) {
      list.sort((a, b) => (a.gio || '99').localeCompare(b.gio || '99'));
    }

    list.forEach((row, idx) => {
      if (!row.stt || sortTime) row.stt = idx + 1;
    });

    return { list, target: target || new Date() };
  };

  const { list: displayList, target: dateTarget } = getFilteredRows();
  const totalPages = Math.ceil(displayList.length / pageSize) || 1;

  // 5. Auto Paging Timer with transition
  useEffect(() => {
    if (!config || totalPages <= 1) return;
    const intervalSec = Math.max(2, Number(config.interval_sec || config.interval) || 10);

    const timer = setInterval(() => {
      setAnimClass('slide-out');
      setTimeout(() => {
        setCurrentPage(prev => (prev + 1) % totalPages);
        setAnimClass('slide-in');
      }, 350);
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [config, totalPages]);

  const pagedRows = displayList.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const logoUrl = (config?.logo || '').trim() || '/image/LOGO-THACO-AUTO-white.png';
  const dateLabel = config?.date_label || config?.dateLabel || 'NGÀY:';

  return (
    <div className="thaco-display-root" ref={rootRef}>
      <main className="thaco-display-app" id="app">
        {/* Header matching original #head exactly */}
        <header className="thaco-display-head" id="head">
          <div className="thaco-display-logo" id="logo">
            <img src={logoUrl} alt="THACO AUTO" />
          </div>
          <img
            src="/image/LOGO-THACO-AUTO.png"
            alt="THACO AUTO"
            className="thaco-responsive-logo"
          />
          <div className="thaco-display-titles" id="titles">
            <h1 className="thaco-display-title" id="title">
              {config?.title || 'KHÁCH HÀNG ĐẶT LỊCH HẸN'}
            </h1>
            <div className="thaco-display-date" id="dateTitle">
              {dateLabel} {formatDate(dateTarget)}
            </div>
          </div>
        </header>

        {/* Gợi ý vuốt ngang trên màn hình di động */}
        {/* <div className="thaco-mobile-scroll-hint">
          👉 Vuốt ngang để xem đầy đủ 7 cột thông tin
        </div> */}

        {/* Section Grid matching original #grid exactly */}
        <section className="thaco-display-grid" id="grid" aria-label="Lịch hẹn dịch vụ">
          {/* Heading Row */}
          <div className="thaco-display-row thaco-display-heading heading-row">
            <div>STT</div>
            <div>KHÁCH HÀNG</div>
            <div>BIỂN SỐ XE</div>
            <div>MẪU XE</div>
            <div>THỜI GIAN</div>
            <div>NỘI DUNG CÔNG VIỆC</div>
            <div>TƯ VẤN DỊCH VỤ</div>
          </div>

          {/* Body Container */}
          <div className="thaco-display-body" id="body" ref={bodyRef}>
            <div className={`thaco-display-page ${animClass}`} id="page">
              {pagedRows.map((row, idx) => (
                <div key={idx} className="thaco-display-row data-row">
                  <div title={row.stt}>{row.stt}</div>
                  <div title={row.kh}>{row.kh}</div>
                  <div title={row.bs}>{row.bs}</div>
                  <div title={row.xe}>{row.xe}</div>
                  <div title={row.gio}>{row.gio}</div>
                  <div title={row.nd}>{row.nd}</div>
                  <div title={row.tv}>{row.tv}</div>
                </div>
              ))}
            </div>

            {isDataLoading ? (
              <div className="thaco-display-message" id="message">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                  <div className="thaco-spinner" />
                  <span style={{ fontSize: '1.25rem', color: 'var(--text-color, #00529c)', fontWeight: 700 }}>
                    Đang tải dữ liệu lịch hẹn...
                  </span>
                </div>
              </div>
            ) : displayList.length === 0 ? (
              <div className="thaco-display-message" id="message">
                {loadError || config?.empty_message || config?.emptyMessage || 'Hôm nay chưa có lịch hẹn'}
              </div>
            ) : null}
          </div>
        </section>
      </main>

      {/* Status Dot fixed bottom-left */}
      <div
        className="thaco-display-status-dot"
        id="statusDot"
        style={{ background: statusDotColor }}
        title={statusDotTitle}
      />

      {/* Page Number fixed bottom-right */}
      {totalPages > 1 && (
        <div className="thaco-display-page-number" id="pageNumber">
          Trang {currentPage + 1}/{totalPages}
        </div>
      )}
    </div>
  );
}
