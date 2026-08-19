export interface RegionDistrict {
  name: string;
  postal_code: string;
}

export interface RegionCity {
  name: string;
  type: 'Kota' | 'Kabupaten';
  province: string;
  districts: RegionDistrict[];
}

export const INDONESIA_REGIONS: RegionCity[] = [
  // DKI Jakarta
  {
    name: 'Kota Jakarta Selatan',
    type: 'Kota',
    province: 'DKI Jakarta',
    districts: [
      { name: 'Kebayoran Baru', postal_code: '12110' },
      { name: 'Kebayoran Lama', postal_code: '12240' },
      { name: 'Cilandak', postal_code: '12430' },
      { name: 'Pesanggrahan', postal_code: '12260' },
      { name: 'Passar Minggu', postal_code: '12520' },
      { name: 'Jagakarsa', postal_code: '12620' },
      { name: 'Mampang Prapatan', postal_code: '12790' },
      { name: 'Pancoran', postal_code: '12780' },
      { name: 'Tebet', postal_code: '12810' },
      { name: 'Setiabudi', postal_code: '12920' },
    ],
  },
  {
    name: 'Kota Jakarta Pusat',
    type: 'Kota',
    province: 'DKI Jakarta',
    districts: [
      { name: 'Gambir', postal_code: '10110' },
      { name: 'Tanah Abang', postal_code: '10210' },
      { name: 'Menteng', postal_code: '10310' },
      { name: 'Senen', postal_code: '10410' },
      { name: 'Cempaka Putih', postal_code: '10510' },
      { name: 'Johar Baru', postal_code: '10560' },
      { name: 'Kemayoran', postal_code: '10610' },
      { name: 'Sawah Besar', postal_code: '10710' },
    ],
  },
  {
    name: 'Kota Jakarta Barat',
    type: 'Kota',
    province: 'DKI Jakarta',
    districts: [
      { name: 'Kebon Jeruk', postal_code: '11530' },
      { name: 'Palmerah', postal_code: '11480' },
      { name: 'Grogol Petamburan', postal_code: '11450' },
      { name: 'Kembangan', postal_code: '11610' },
      { name: 'Cengkareng', postal_code: '11730' },
      { name: 'Kalideres', postal_code: '11840' },
      { name: 'Taman Sari', postal_code: '11150' },
      { name: 'Tambora', postal_code: '11220' },
    ],
  },
  {
    name: 'Kota Jakarta Timur',
    type: 'Kota',
    province: 'DKI Jakarta',
    districts: [
      { name: 'Matraman', postal_code: '13110' },
      { name: 'Pulo Gadung', postal_code: '13210' },
      { name: 'Jatinegara', postal_code: '13310' },
      { name: 'Duren Sawit', postal_code: '13440' },
      { name: 'Kramat Jati', postal_code: '13510' },
      { name: 'Makasar', postal_code: '13570' },
      { name: 'Pasar Rebo', postal_code: '13710' },
      { name: 'Ciracas', postal_code: '13740' },
      { name: 'Cipayung', postal_code: '13840' },
      { name: 'Cakung', postal_code: '13910' },
    ],
  },
  {
    name: 'Kota Jakarta Utara',
    type: 'Kota',
    province: 'DKI Jakarta',
    districts: [
      { name: 'Penjaringan', postal_code: '14440' },
      { name: 'Pademangan', postal_code: '14420' },
      { name: 'Tanjung Priok', postal_code: '14310' },
      { name: 'Koja', postal_code: '14220' },
      { name: 'Kelapa Gading', postal_code: '14240' },
      { name: 'Cilincing', postal_code: '14120' },
    ],
  },

  // Banten
  {
    name: 'Kota Tangerang Selatan',
    type: 'Kota',
    province: 'Banten',
    districts: [
      { name: 'Serpong', postal_code: '15310' },
      { name: 'Serpong Utara', postal_code: '15326' },
      { name: 'Pondok Aren', postal_code: '15224' },
      { name: 'Ciputat', postal_code: '15411' },
      { name: 'Ciputat Timur', postal_code: '15419' },
      { name: 'Pamulang', postal_code: '15417' },
      { name: 'Setu', postal_code: '15314' },
    ],
  },
  {
    name: 'Kota Tangerang',
    type: 'Kota',
    province: 'Banten',
    districts: [
      { name: 'Tangerang', postal_code: '15111' },
      { name: 'Karawaci', postal_code: '15115' },
      { name: 'Cipondoh', postal_code: '15148' },
      { name: 'Ciledug', postal_code: '15151' },
      { name: 'Batuceper', postal_code: '15122' },
      { name: 'Benda', postal_code: '15125' },
      { name: 'Jatiuwung', postal_code: '15134' },
      { name: 'Periuk', postal_code: '15131' },
      { name: 'Pinang', postal_code: '15145' },
      { name: 'Larangan', postal_code: '15154' },
      { name: 'Neglasari', postal_code: '15129' },
    ],
  },
  {
    name: 'Kabupaten Tangerang',
    type: 'Kabupaten',
    province: 'Banten',
    districts: [
      { name: 'Kelapa Dua', postal_code: '15810' },
      { name: 'Curug', postal_code: '15810' },
      { name: 'Cikupa', postal_code: '15710' },
      { name: 'Balaraja', postal_code: '15610' },
      { name: 'Pasar Kemis', postal_code: '15560' },
      { name: 'Tigaraksa', postal_code: '15720' },
      { name: 'Cisauk', postal_code: '15345' },
      { name: 'Legok', postal_code: '15820' },
      { name: 'Pagedangan', postal_code: '15339' },
    ],
  },
  {
    name: 'Kota Serang',
    type: 'Kota',
    province: 'Banten',
    districts: [
      { name: 'Serang', postal_code: '42111' },
      { name: 'Cipocok Jaya', postal_code: '42121' },
      { name: 'Curug', postal_code: '42171' },
      { name: 'Kasemen', postal_code: '42191' },
      { name: 'Taktakan', postal_code: '42162' },
      { name: 'Walantaka', postal_code: '42183' },
    ],
  },
  {
    name: 'Kota Cilegon',
    type: 'Kota',
    province: 'Banten',
    districts: [
      { name: 'Cilegon', postal_code: '42414' },
      { name: 'Cibeber', postal_code: '42426' },
      { name: 'Citangkil', postal_code: '42441' },
      { name: 'Ciwandan', postal_code: '42444' },
      { name: 'Gerogol', postal_code: '42436' },
      { name: 'Jombang', postal_code: '42411' },
      { name: 'Pulomerak', postal_code: '42438' },
      { name: 'Purwakarta', postal_code: '42437' },
    ],
  },

  // Jawa Barat
  {
    name: 'Kota Depok',
    type: 'Kota',
    province: 'Jawa Barat',
    districts: [
      { name: 'Pancoran Mas', postal_code: '16436' },
      { name: 'Beji', postal_code: '16421' },
      { name: 'Sukmajaya', postal_code: '16412' },
      { name: 'Cimanggis', postal_code: '16452' },
      { name: 'Tapos', postal_code: '16457' },
      { name: 'Cinere', postal_code: '16514' },
      { name: 'Limo', postal_code: '16515' },
      { name: 'Sawangan', postal_code: '16511' },
      { name: 'Bojongsari', postal_code: '16516' },
      { name: 'Cilodong', postal_code: '16413' },
      { name: 'Cipayung', postal_code: '16437' },
    ],
  },
  {
    name: 'Kota Bekasi',
    type: 'Kota',
    province: 'Jawa Barat',
    districts: [
      { name: 'Bekasi Timur', postal_code: '17111' },
      { name: 'Bekasi Barat', postal_code: '17145' },
      { name: 'Bekasi Selatan', postal_code: '17148' },
      { name: 'Bekasi Utara', postal_code: '17121' },
      { name: 'Pondok Gede', postal_code: '17411' },
      { name: 'Jatiasih', postal_code: '17423' },
      { name: 'Medan Satria', postal_code: '17132' },
      { name: 'Rawalumbu', postal_code: '17116' },
      { name: 'Mustika Jaya', postal_code: '17158' },
      { name: 'Bantargebang', postal_code: '17151' },
      { name: 'Jatisampurna', postal_code: '17433' },
    ],
  },
  {
    name: 'Kabupaten Bekasi',
    type: 'Kabupaten',
    province: 'Jawa Barat',
    districts: [
      { name: 'Cikarang Pusat', postal_code: '17530' },
      { name: 'Cikarang Barat', postal_code: '17520' },
      { name: 'Cikarang Timur', postal_code: '17530' },
      { name: 'Cikarang Utara', postal_code: '17530' },
      { name: 'Cikarang Selatan', postal_code: '17530' },
      { name: 'Tambun Selatan', postal_code: '17510' },
      { name: 'Tambun Utara', postal_code: '17510' },
      { name: 'Cibitung', postal_code: '17520' },
    ],
  },
  {
    name: 'Kota Bogor',
    type: 'Kota',
    province: 'Jawa Barat',
    districts: [
      { name: 'Bogor Tengah', postal_code: '16121' },
      { name: 'Bogor Utara', postal_code: '16153' },
      { name: 'Bogor Selatan', postal_code: '16132' },
      { name: 'Bogor Timur', postal_code: '16143' },
      { name: 'Bogor Barat', postal_code: '16118' },
      { name: 'Tanah Sareal', postal_code: '16161' },
    ],
  },
  {
    name: 'Kabupaten Bogor',
    type: 'Kabupaten',
    province: 'Jawa Barat',
    districts: [
      { name: 'Cibinong', postal_code: '16911' },
      { name: 'Babakan Madang', postal_code: '16810' },
      { name: 'Bojonggede', postal_code: '16922' },
      { name: 'Cileungsi', postal_code: '16820' },
      { name: 'Citeureup', postal_code: '16810' },
      { name: 'Gunung Putri', postal_code: '16961' },
      { name: 'Parung', postal_code: '16330' },
      { name: 'Sukaja', postal_code: '16660' },
    ],
  },
  {
    name: 'Kota Bandung',
    type: 'Kota',
    province: 'Jawa Barat',
    districts: [
      { name: 'Coblong', postal_code: '40132' },
      { name: 'Sukajadi', postal_code: '40161' },
      { name: 'Cicendo', postal_code: '40171' },
      { name: 'Andir', postal_code: '40181' },
      { name: 'Lengkong', postal_code: '40261' },
      { name: 'Regol', postal_code: '40251' },
      { name: 'Sumur Bandung', postal_code: '40111' },
      { name: 'Batununggal', postal_code: '40266' },
      { name: 'Bandung Wetan', postal_code: '40115' },
      { name: 'Astana Anyar', postal_code: '40241' },
      { name: 'Antapani', postal_code: '40291' },
      { name: 'Arcamanik', postal_code: '40293' },
      { name: 'Buahbatu', postal_code: '40286' },
      { name: 'Cibeunying Kaler', postal_code: '40123' },
      { name: 'Cibeunying Kidul', postal_code: '40124' },
    ],
  },
  {
    name: 'Kota Cimahi',
    type: 'Kota',
    province: 'Jawa Barat',
    districts: [
      { name: 'Cimahi Selatan', postal_code: '40531' },
      { name: 'Cimahi Tengah', postal_code: '40521' },
      { name: 'Cimahi Utara', postal_code: '40511' },
    ],
  },
  {
    name: 'Kabupaten Bandung',
    type: 'Kabupaten',
    province: 'Jawa Barat',
    districts: [
      { name: 'Soreang', postal_code: '40911' },
      { name: 'Baleendah', postal_code: '40375' },
      { name: 'Dayeuhkolot', postal_code: '40257' },
      { name: 'Bojongsoang', postal_code: '40287' },
      { name: 'Margahayu', postal_code: '40225' },
    ],
  },

  // Jawa Tengah & DI Yogyakarta
  {
    name: 'Kota Semarang',
    type: 'Kota',
    province: 'Jawa Tengah',
    districts: [
      { name: 'Semarang Tengah', postal_code: '50131' },
      { name: 'Semarang Barat', postal_code: '50141' },
      { name: 'Semarang Timur', postal_code: '50121' },
      { name: 'Semarang Selatan', postal_code: '50241' },
      { name: 'Semarang Utara', postal_code: '50171' },
      { name: 'Banyumanik', postal_code: '50261' },
      { name: 'Gajahmungkur', postal_code: '50231' },
      { name: 'Candisari', postal_code: '50251' },
      { name: 'Pedurungan', postal_code: '50192' },
      { name: 'Tembalang', postal_code: '50271' },
    ],
  },
  {
    name: 'Kota Surakarta (Solo)',
    type: 'Kota',
    province: 'Jawa Tengah',
    districts: [
      { name: 'Banjarsari', postal_code: '57131' },
      { name: 'Jebres', postal_code: '57121' },
      { name: 'Laweyan', postal_code: '57141' },
      { name: 'Pasar Kliwon', postal_code: '57111' },
      { name: 'Serengan', postal_code: '57151' },
    ],
  },
  {
    name: 'Kota Yogyakarta',
    type: 'Kota',
    province: 'DI Yogyakarta',
    districts: [
      { name: 'Gondomanan', postal_code: '55121' },
      { name: 'Danurejan', postal_code: '55211' },
      { name: 'Gedongtengen', postal_code: '55271' },
      { name: 'Kraton', postal_code: '55131' },
      { name: 'Mergangsan', postal_code: '55151' },
      { name: 'Umbulharjo', postal_code: '55161' },
      { name: 'Kotagede', postal_code: '55171' },
      { name: 'Wirobrajan', postal_code: '55251' },
      { name: 'Mantrijeron', postal_code: '55141' },
    ],
  },
  {
    name: 'Kabupaten Sleman',
    type: 'Kabupaten',
    province: 'DI Yogyakarta',
    districts: [
      { name: 'Depok', postal_code: '55281' },
      { name: 'Mlati', postal_code: '55285' },
      { name: 'Gamping', postal_code: '55291' },
      { name: 'Ngaglik', postal_code: '55581' },
      { name: 'Kalasan', postal_code: '55571' },
    ],
  },

  // Jawa Timur
  {
    name: 'Kota Surabaya',
    type: 'Kota',
    province: 'Jawa Timur',
    districts: [
      { name: 'Tegalsari', postal_code: '60261' },
      { name: 'Genteng', postal_code: '60271' },
      { name: 'Bubutan', postal_code: '60174' },
      { name: 'Simokerto', postal_code: '60141' },
      { name: 'Gubeng', postal_code: '60281' },
      { name: 'Wonokromo', postal_code: '60241' },
      { name: 'Rungkut', postal_code: '60293' },
      { name: 'Sukolilo', postal_code: '60111' },
      { name: 'Mulyorejo', postal_code: '60115' },
      { name: 'Sawahan', postal_code: '60251' },
      { name: 'Dukuh Pakis', postal_code: '60225' },
      { name: 'Wiyung', postal_code: '60228' },
      { name: 'Sambikerep', postal_code: '60217' },
    ],
  },
  {
    name: 'Kabupaten Sidoarjo',
    type: 'Kabupaten',
    province: 'Jawa Timur',
    districts: [
      { name: 'Sidoarjo', postal_code: '61211' },
      { name: 'Waru', postal_code: '61256' },
      { name: 'Gedangan', postal_code: '61254' },
      { name: 'Taman', postal_code: '61257' },
      { name: 'Buduran', postal_code: '61252' },
      { name: 'Candi', postal_code: '61271' },
    ],
  },
  {
    name: 'Kota Malang',
    type: 'Kota',
    province: 'Jawa Timur',
    districts: [
      { name: 'Klojen', postal_code: '65111' },
      { name: 'Blimbing', postal_code: '65121' },
      { name: 'Kedungkandang', postal_code: '65131' },
      { name: 'Lowokwaru', postal_code: '65141' },
      { name: 'Sukun', postal_code: '65146' },
    ],
  },

  // Bali
  {
    name: 'Kota Denpasar',
    type: 'Kota',
    province: 'Bali',
    districts: [
      { name: 'Denpasar Barat', postal_code: '80119' },
      { name: 'Denpasar Timur', postal_code: '80235' },
      { name: 'Denpasar Selatan', postal_code: '80227' },
      { name: 'Denpasar Utara', postal_code: '80115' },
    ],
  },
  {
    name: 'Kabupaten Badung',
    type: 'Kabupaten',
    province: 'Bali',
    districts: [
      { name: 'Kuta', postal_code: '80361' },
      { name: 'Kuta Selatan', postal_code: '80363' },
      { name: 'Kuta Utara', postal_code: '80361' },
      { name: 'Mengwi', postal_code: '80351' },
      { name: 'Abiansemal', postal_code: '80352' },
    ],
  },

  // Sumatera
  {
    name: 'Kota Medan',
    type: 'Kota',
    province: 'Sumatera Utara',
    districts: [
      { name: 'Medan Kota', postal_code: '20211' },
      { name: 'Medan Baru', postal_code: '20153' },
      { name: 'Medan Barat', postal_code: '20111' },
      { name: 'Medan Timur', postal_code: '20231' },
      { name: 'Medan Petisah', postal_code: '20112' },
      { name: 'Medan Helvetia', postal_code: '20124' },
      { name: 'Medan Sunggal', postal_code: '20128' },
      { name: 'Medan Selayang', postal_code: '20131' },
      { name: 'Medan Tembung', postal_code: '20222' },
      { name: 'Medan Denai', postal_code: '20227' },
      { name: 'Medan Amplas', postal_code: '20148' },
      { name: 'Medan Johor', postal_code: '20144' },
    ],
  },
  {
    name: 'Kota Palembang',
    type: 'Kota',
    province: 'Sumatera Selatan',
    districts: [
      { name: 'Ilir Barat I', postal_code: '30139' },
      { name: 'Ilir Barat II', postal_code: '30144' },
      { name: 'Ilir Timur I', postal_code: '30114' },
      { name: 'Ilir Timur II', postal_code: '30113' },
      { name: 'Seberang Ulu I', postal_code: '30252' },
      { name: 'Seberang Ulu II', postal_code: '30263' },
      { name: 'Sukarami', postal_code: '30151' },
      { name: 'Alang-Alang Lebar', postal_code: '30154' },
      { name: 'Kemuning', postal_code: '30127' },
      { name: 'Bukit Kecil', postal_code: '30135' },
    ],
  },
  {
    name: 'Kota Bandar Lampung',
    type: 'Kota',
    province: 'Lampung',
    districts: [
      { name: 'Tanjung Karang Pusat', postal_code: '35111' },
      { name: 'Tanjung Karang Timur', postal_code: '35121' },
      { name: 'Tanjung Karang Barat', postal_code: '35151' },
      { name: 'Kedaton', postal_code: '35141' },
      { name: 'Rajabasa', postal_code: '35144' },
      { name: 'Teluk Betung Selatan', postal_code: '35221' },
      { name: 'Teluk Betung Utara', postal_code: '35211' },
      { name: 'Enggal', postal_code: '35118' },
    ],
  },

  // Sulawesi & Kalimantan
  {
    name: 'Kota Makassar',
    type: 'Kota',
    province: 'Sulawesi Selatan',
    districts: [
      { name: 'Ujung Pandang', postal_code: '90111' },
      { name: 'Makassar', postal_code: '90145' },
      { name: 'Panakkukang', postal_code: '90231' },
      { name: 'Rappocini', postal_code: '90222' },
      { name: 'Tamalate', postal_code: '90134' },
      { name: 'Mariso', postal_code: '90121' },
      { name: 'Mamajang', postal_code: '90132' },
      { name: 'Manggala', postal_code: '90234' },
      { name: 'Biringkanaya', postal_code: '90241' },
      { name: 'Tamalanrea', postal_code: '90245' },
    ],
  },
  {
    name: 'Kota Balikpapan',
    type: 'Kota',
    province: 'Kalimantan Timur',
    districts: [
      { name: 'Balikpapan Kota', postal_code: '76111' },
      { name: 'Balikpapan Tengah', postal_code: '76122' },
      { name: 'Balikpapan Selatan', postal_code: '76115' },
      { name: 'Balikpapan Utara', postal_code: '76125' },
      { name: 'Balikpapan Barat', postal_code: '76131' },
      { name: 'Balikpapan Timur', postal_code: '76116' },
    ],
  },
  {
    name: 'Kota Samarinda',
    type: 'Kota',
    province: 'Kalimantan Timur',
    districts: [
      { name: 'Samarinda Kota', postal_code: '75111' },
      { name: 'Samarinda Ulu', postal_code: '75123' },
      { name: 'Samarinda Ilir', postal_code: '75115' },
      { name: 'Samarinda Seberang', postal_code: '75131' },
      { name: 'Sungai Kunjang', postal_code: '75126' },
      { name: 'Palaran', postal_code: '75241' },
      { name: 'Sambutan', postal_code: '75116' },
    ],
  },
];

// Helper Functions
export const getAllCities = (): string[] => {
  return INDONESIA_REGIONS.map((c) => c.name);
};

export const getDistrictsByCity = (cityName: string): RegionDistrict[] => {
  if (!cityName) return [];
  const normalized = cityName.trim().toLowerCase();
  const city = INDONESIA_REGIONS.find(
    (c) =>
      c.name.toLowerCase() === normalized ||
      c.name.toLowerCase().includes(normalized) ||
      normalized.includes(c.name.toLowerCase())
  );
  return city ? city.districts : [];
};

export const getPostalCodeByDistrict = (cityName: string, districtName: string): string => {
  const districts = getDistrictsByCity(cityName);
  const found = districts.find(
    (d) => d.name.toLowerCase() === districtName.trim().toLowerCase()
  );
  return found ? found.postal_code : '';
};
