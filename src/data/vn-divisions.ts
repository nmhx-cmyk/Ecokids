// MVP subset of VN administrative divisions. For production, replace with a complete dataset (e.g. from open-data sources).

export interface Ward {
  code: string;
  name: string;
}

export interface District {
  code: string;
  name: string;
  wards: Ward[];
}

export interface Province {
  code: string;
  name: string;
  districts: District[];
}

function w(code: string, name: string): Ward {
  return { code, name };
}

export const VN_PROVINCES: Province[] = [
  {
    code: "01",
    name: "Hà Nội",
    districts: [
      {
        code: "01_001",
        name: "Quận Ba Đình",
        wards: [
          w("01_001_00001", "Phường Phúc Xá"),
          w("01_001_00002", "Phường Trúc Bạch"),
          w("01_001_00003", "Phường Vĩnh Phúc"),
          w("01_001_00004", "Phường Cống Vị"),
          w("01_001_00005", "Phường Liễu Giai"),
        ],
      },
      {
        code: "01_002",
        name: "Quận Hoàn Kiếm",
        wards: [
          w("01_002_00001", "Phường Phúc Tân"),
          w("01_002_00002", "Phường Đồng Xuân"),
          w("01_002_00003", "Phường Hàng Mã"),
          w("01_002_00004", "Phường Hàng Buồm"),
          w("01_002_00005", "Phường Hàng Bài"),
        ],
      },
      {
        code: "01_003",
        name: "Quận Hai Bà Trưng",
        wards: [
          w("01_003_00001", "Phường Nguyễn Du"),
          w("01_003_00002", "Phường Bùi Thị Xuân"),
          w("01_003_00003", "Phường Phố Huế"),
          w("01_003_00004", "Phường Đống Mác"),
        ],
      },
      {
        code: "01_004",
        name: "Quận Đống Đa",
        wards: [
          w("01_004_00001", "Phường Cát Linh"),
          w("01_004_00002", "Phường Văn Miếu"),
          w("01_004_00003", "Phường Quốc Tử Giám"),
          w("01_004_00004", "Phường Láng Thượng"),
        ],
      },
      {
        code: "01_005",
        name: "Quận Cầu Giấy",
        wards: [
          w("01_005_00001", "Phường Nghĩa Đô"),
          w("01_005_00002", "Phường Nghĩa Tân"),
          w("01_005_00003", "Phường Mai Dịch"),
          w("01_005_00004", "Phường Dịch Vọng"),
          w("01_005_00005", "Phường Yên Hòa"),
        ],
      },
      {
        code: "01_006",
        name: "Quận Thanh Xuân",
        wards: [
          w("01_006_00001", "Phường Nhân Chính"),
          w("01_006_00002", "Phường Thanh Xuân Trung"),
          w("01_006_00003", "Phường Thanh Xuân Bắc"),
          w("01_006_00004", "Phường Khương Mai"),
        ],
      },
    ],
  },
  {
    code: "02",
    name: "TP. Hồ Chí Minh",
    districts: [
      {
        code: "02_001",
        name: "Quận 1",
        wards: [
          w("02_001_00001", "Phường Bến Nghé"),
          w("02_001_00002", "Phường Bến Thành"),
          w("02_001_00003", "Phường Đa Kao"),
          w("02_001_00004", "Phường Nguyễn Thái Bình"),
          w("02_001_00005", "Phường Phạm Ngũ Lão"),
        ],
      },
      {
        code: "02_002",
        name: "Quận 3",
        wards: [
          w("02_002_00001", "Phường Võ Thị Sáu"),
          w("02_002_00002", "Phường 9"),
          w("02_002_00003", "Phường 10"),
          w("02_002_00004", "Phường 11"),
          w("02_002_00005", "Phường 12"),
        ],
      },
      {
        code: "02_003",
        name: "Quận 7",
        wards: [
          w("02_003_00001", "Phường Tân Thuận Đông"),
          w("02_003_00002", "Phường Tân Thuận Tây"),
          w("02_003_00003", "Phường Tân Phú"),
          w("02_003_00004", "Phường Phú Mỹ"),
        ],
      },
      {
        code: "02_004",
        name: "Quận Bình Thạnh",
        wards: [
          w("02_004_00001", "Phường 1"),
          w("02_004_00002", "Phường 2"),
          w("02_004_00003", "Phường 12"),
          w("02_004_00004", "Phường 25"),
          w("02_004_00005", "Phường 26"),
        ],
      },
      {
        code: "02_005",
        name: "Quận Phú Nhuận",
        wards: [
          w("02_005_00001", "Phường 1"),
          w("02_005_00002", "Phường 2"),
          w("02_005_00003", "Phường 3"),
          w("02_005_00004", "Phường 4"),
        ],
      },
      {
        code: "02_006",
        name: "TP. Thủ Đức",
        wards: [
          w("02_006_00001", "Phường An Phú"),
          w("02_006_00002", "Phường Thảo Điền"),
          w("02_006_00003", "Phường Linh Trung"),
          w("02_006_00004", "Phường Hiệp Phú"),
          w("02_006_00005", "Phường Bình Thọ"),
        ],
      },
    ],
  },
  {
    code: "03",
    name: "Đà Nẵng",
    districts: [
      {
        code: "03_001",
        name: "Quận Hải Châu",
        wards: [
          w("03_001_00001", "Phường Thanh Bình"),
          w("03_001_00002", "Phường Thuận Phước"),
          w("03_001_00003", "Phường Hải Châu I"),
          w("03_001_00004", "Phường Hải Châu II"),
        ],
      },
      {
        code: "03_002",
        name: "Quận Thanh Khê",
        wards: [
          w("03_002_00001", "Phường Tam Thuận"),
          w("03_002_00002", "Phường Thanh Khê Đông"),
          w("03_002_00003", "Phường Thanh Khê Tây"),
          w("03_002_00004", "Phường Xuân Hà"),
        ],
      },
      {
        code: "03_003",
        name: "Quận Sơn Trà",
        wards: [
          w("03_003_00001", "Phường Mân Thái"),
          w("03_003_00002", "Phường Thọ Quang"),
          w("03_003_00003", "Phường An Hải Bắc"),
          w("03_003_00004", "Phường Phước Mỹ"),
        ],
      },
      {
        code: "03_004",
        name: "Quận Ngũ Hành Sơn",
        wards: [
          w("03_004_00001", "Phường Mỹ An"),
          w("03_004_00002", "Phường Khuê Mỹ"),
          w("03_004_00003", "Phường Hòa Quý"),
          w("03_004_00004", "Phường Hòa Hải"),
        ],
      },
    ],
  },
  {
    code: "04",
    name: "Hải Phòng",
    districts: [
      {
        code: "04_001",
        name: "Quận Hồng Bàng",
        wards: [
          w("04_001_00001", "Phường Quán Toan"),
          w("04_001_00002", "Phường Hùng Vương"),
          w("04_001_00003", "Phường Sở Dầu"),
          w("04_001_00004", "Phường Thượng Lý"),
        ],
      },
      {
        code: "04_002",
        name: "Quận Lê Chân",
        wards: [
          w("04_002_00001", "Phường An Biên"),
          w("04_002_00002", "Phường An Dương"),
          w("04_002_00003", "Phường Cát Dài"),
          w("04_002_00004", "Phường Trại Cau"),
        ],
      },
      {
        code: "04_003",
        name: "Quận Ngô Quyền",
        wards: [
          w("04_003_00001", "Phường Máy Tơ"),
          w("04_003_00002", "Phường Máy Chai"),
          w("04_003_00003", "Phường Cầu Tre"),
          w("04_003_00004", "Phường Lạc Viên"),
        ],
      },
      {
        code: "04_004",
        name: "Quận Hải An",
        wards: [
          w("04_004_00001", "Phường Đông Hải 1"),
          w("04_004_00002", "Phường Đông Hải 2"),
          w("04_004_00003", "Phường Đằng Lâm"),
          w("04_004_00004", "Phường Cát Bi"),
        ],
      },
    ],
  },
  {
    code: "05",
    name: "Cần Thơ",
    districts: [
      {
        code: "05_001",
        name: "Quận Ninh Kiều",
        wards: [
          w("05_001_00001", "Phường Cái Khế"),
          w("05_001_00002", "Phường An Hòa"),
          w("05_001_00003", "Phường Thới Bình"),
          w("05_001_00004", "Phường An Nghiệp"),
        ],
      },
      {
        code: "05_002",
        name: "Quận Bình Thủy",
        wards: [
          w("05_002_00001", "Phường Bình Thủy"),
          w("05_002_00002", "Phường Trà An"),
          w("05_002_00003", "Phường Trà Nóc"),
          w("05_002_00004", "Phường Long Hòa"),
        ],
      },
      {
        code: "05_003",
        name: "Quận Cái Răng",
        wards: [
          w("05_003_00001", "Phường Lê Bình"),
          w("05_003_00002", "Phường Hưng Phú"),
          w("05_003_00003", "Phường Hưng Thạnh"),
          w("05_003_00004", "Phường Ba Láng"),
        ],
      },
      {
        code: "05_004",
        name: "Quận Ô Môn",
        wards: [
          w("05_004_00001", "Phường Châu Văn Liêm"),
          w("05_004_00002", "Phường Thới Hòa"),
          w("05_004_00003", "Phường Phước Thới"),
          w("05_004_00004", "Phường Trường Lạc"),
        ],
      },
    ],
  },
  {
    code: "06",
    name: "Bình Dương",
    districts: [
      {
        code: "06_001",
        name: "TP. Thủ Dầu Một",
        wards: [
          w("06_001_00001", "Phường Phú Cường"),
          w("06_001_00002", "Phường Phú Hòa"),
          w("06_001_00003", "Phường Phú Lợi"),
          w("06_001_00004", "Phường Phú Thọ"),
        ],
      },
      {
        code: "06_002",
        name: "TP. Dĩ An",
        wards: [
          w("06_002_00001", "Phường Dĩ An"),
          w("06_002_00002", "Phường Tân Đông Hiệp"),
          w("06_002_00003", "Phường Tân Bình"),
          w("06_002_00004", "Phường Bình An"),
        ],
      },
      {
        code: "06_003",
        name: "TP. Thuận An",
        wards: [
          w("06_003_00001", "Phường Lái Thiêu"),
          w("06_003_00002", "Phường An Thạnh"),
          w("06_003_00003", "Phường Bình Hòa"),
          w("06_003_00004", "Phường Thuận Giao"),
        ],
      },
      {
        code: "06_004",
        name: "Huyện Bến Cát",
        wards: [
          w("06_004_00001", "Thị trấn Mỹ Phước"),
          w("06_004_00002", "Xã An Điền"),
          w("06_004_00003", "Xã Phú An"),
          w("06_004_00004", "Xã Thới Hòa"),
        ],
      },
    ],
  },
  {
    code: "07",
    name: "Đồng Nai",
    districts: [
      {
        code: "07_001",
        name: "TP. Biên Hòa",
        wards: [
          w("07_001_00001", "Phường Trảng Dài"),
          w("07_001_00002", "Phường Tân Phong"),
          w("07_001_00003", "Phường Tân Biên"),
          w("07_001_00004", "Phường Hố Nai"),
        ],
      },
      {
        code: "07_002",
        name: "TP. Long Khánh",
        wards: [
          w("07_002_00001", "Phường Xuân Trung"),
          w("07_002_00002", "Phường Xuân Thanh"),
          w("07_002_00003", "Phường Xuân Bình"),
          w("07_002_00004", "Phường Xuân An"),
        ],
      },
      {
        code: "07_003",
        name: "Huyện Trảng Bom",
        wards: [
          w("07_003_00001", "Thị trấn Trảng Bom"),
          w("07_003_00002", "Xã Bắc Sơn"),
          w("07_003_00003", "Xã Bình Minh"),
          w("07_003_00004", "Xã Quảng Tiến"),
        ],
      },
      {
        code: "07_004",
        name: "Huyện Long Thành",
        wards: [
          w("07_004_00001", "Thị trấn Long Thành"),
          w("07_004_00002", "Xã An Phước"),
          w("07_004_00003", "Xã Tam An"),
          w("07_004_00004", "Xã Long Đức"),
        ],
      },
    ],
  },
  {
    code: "08",
    name: "Khánh Hòa",
    districts: [
      {
        code: "08_001",
        name: "TP. Nha Trang",
        wards: [
          w("08_001_00001", "Phường Vĩnh Hải"),
          w("08_001_00002", "Phường Vĩnh Phước"),
          w("08_001_00003", "Phường Lộc Thọ"),
          w("08_001_00004", "Phường Phước Tân"),
        ],
      },
      {
        code: "08_002",
        name: "TP. Cam Ranh",
        wards: [
          w("08_002_00001", "Phường Cam Nghĩa"),
          w("08_002_00002", "Phường Cam Phúc Bắc"),
          w("08_002_00003", "Phường Cam Lộc"),
          w("08_002_00004", "Phường Cam Phú"),
        ],
      },
      {
        code: "08_003",
        name: "Thị xã Ninh Hòa",
        wards: [
          w("08_003_00001", "Phường Ninh Hiệp"),
          w("08_003_00002", "Phường Ninh Giang"),
          w("08_003_00003", "Xã Ninh Lộc"),
          w("08_003_00004", "Xã Ninh An"),
        ],
      },
      {
        code: "08_004",
        name: "Huyện Diên Khánh",
        wards: [
          w("08_004_00001", "Thị trấn Diên Khánh"),
          w("08_004_00002", "Xã Diên An"),
          w("08_004_00003", "Xã Diên Toàn"),
          w("08_004_00004", "Xã Diên Lâm"),
        ],
      },
    ],
  },
  {
    code: "09",
    name: "Lâm Đồng",
    districts: [
      {
        code: "09_001",
        name: "TP. Đà Lạt",
        wards: [
          w("09_001_00001", "Phường 1"),
          w("09_001_00002", "Phường 2"),
          w("09_001_00003", "Phường 3"),
          w("09_001_00004", "Phường 4"),
          w("09_001_00005", "Phường 7"),
        ],
      },
      {
        code: "09_002",
        name: "TP. Bảo Lộc",
        wards: [
          w("09_002_00001", "Phường Lộc Phát"),
          w("09_002_00002", "Phường Lộc Tiến"),
          w("09_002_00003", "Phường 1"),
          w("09_002_00004", "Phường 2"),
        ],
      },
      {
        code: "09_003",
        name: "Huyện Đức Trọng",
        wards: [
          w("09_003_00001", "Thị trấn Liên Nghĩa"),
          w("09_003_00002", "Xã Hiệp An"),
          w("09_003_00003", "Xã Phú Hội"),
          w("09_003_00004", "Xã N'Thol Hạ"),
        ],
      },
      {
        code: "09_004",
        name: "Huyện Di Linh",
        wards: [
          w("09_004_00001", "Thị trấn Di Linh"),
          w("09_004_00002", "Xã Đinh Lạc"),
          w("09_004_00003", "Xã Tân Châu"),
          w("09_004_00004", "Xã Gia Hiệp"),
        ],
      },
    ],
  },
  {
    code: "10",
    name: "Nghệ An",
    districts: [
      {
        code: "10_001",
        name: "TP. Vinh",
        wards: [
          w("10_001_00001", "Phường Lê Lợi"),
          w("10_001_00002", "Phường Hà Huy Tập"),
          w("10_001_00003", "Phường Hưng Bình"),
          w("10_001_00004", "Phường Trung Đô"),
        ],
      },
      {
        code: "10_002",
        name: "Thị xã Cửa Lò",
        wards: [
          w("10_002_00001", "Phường Nghi Hải"),
          w("10_002_00002", "Phường Nghi Hòa"),
          w("10_002_00003", "Phường Thu Thủy"),
          w("10_002_00004", "Phường Nghi Thủy"),
        ],
      },
      {
        code: "10_003",
        name: "Huyện Diễn Châu",
        wards: [
          w("10_003_00001", "Thị trấn Diễn Châu"),
          w("10_003_00002", "Xã Diễn Lâm"),
          w("10_003_00003", "Xã Diễn Đoài"),
          w("10_003_00004", "Xã Diễn Trường"),
        ],
      },
      {
        code: "10_004",
        name: "Huyện Quỳnh Lưu",
        wards: [
          w("10_004_00001", "Thị trấn Cầu Giát"),
          w("10_004_00002", "Xã Quỳnh Thắng"),
          w("10_004_00003", "Xã Quỳnh Tân"),
          w("10_004_00004", "Xã Quỳnh Châu"),
        ],
      },
    ],
  },
];

export function getProvinceByCode(code: string): string | null {
  return VN_PROVINCES.find((p) => p.code === code)?.name ?? null;
}

export function getDistrictByCode(
  provinceCode: string,
  districtCode: string,
): string | null {
  const province = VN_PROVINCES.find((p) => p.code === provinceCode);
  if (!province) return null;
  return province.districts.find((d) => d.code === districtCode)?.name ?? null;
}

export function getWardByCode(
  provinceCode: string,
  districtCode: string,
  wardCode: string,
): string | null {
  const province = VN_PROVINCES.find((p) => p.code === provinceCode);
  if (!province) return null;
  const district = province.districts.find((d) => d.code === districtCode);
  if (!district) return null;
  return district.wards.find((wa) => wa.code === wardCode)?.name ?? null;
}
