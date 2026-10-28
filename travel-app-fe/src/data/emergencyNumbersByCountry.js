const emergencyNumbersByCountry = [
  {
    "region": "Africa",
    "country": "Algeria",
    "police": "1548",
    "ambulance": "14",
    "fire": "14",
    "notes": "Gendarme – 1055"
  },
  {
    "region": "Africa",
    "country": "Angola",
    "police": "113",
    "ambulance": "112/116",
    "fire": "115",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Ascension Island",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Benin",
    "police": "117",
    "ambulance": "112",
    "fire": "118",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Burundi",
    "police": "117",
    "ambulance": "112",
    "fire": "118",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Botswana",
    "police": "999",
    "ambulance": "997",
    "fire": "998",
    "notes": "Mobile phones – 112 ."
  },
  {
    "region": "Africa",
    "country": "Burkina Faso",
    "police": "17",
    "ambulance": "112",
    "fire": "18",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Cameroon",
    "police": "117",
    "ambulance": "119",
    "fire": "118",
    "notes": "Police – 117 ; Ambulance – 119 ; Fire – 118 ; Electricity emergency – 8010 ."
  },
  {
    "region": "Africa",
    "country": "Cape Verde",
    "police": "132",
    "ambulance": "130",
    "fire": "131",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Central African Republic",
    "police": "117",
    "ambulance": "1220",
    "fire": "118",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Chad",
    "police": "17",
    "ambulance": "2251-1237",
    "fire": "18",
    "notes": "Ambulance – 2251-1237 ."
  },
  {
    "region": "Africa",
    "country": "Comoros",
    "police": "17",
    "ambulance": "773-26-04",
    "fire": "18",
    "notes": "Ambulance – 773-26-04 ."
  },
  {
    "region": "Africa",
    "country": "Republic of Congo",
    "police": "117",
    "ambulance": "",
    "fire": "118",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Democratic Republic of Congo",
    "police": "112",
    "ambulance": "",
    "fire": "118",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Djibouti",
    "police": "17",
    "ambulance": "19",
    "fire": "18",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Egypt",
    "police": "128",
    "ambulance": "123",
    "fire": "180",
    "notes": "Tourist police – 126 ; Traffic police – 128 ; Electricity emergency – 121 ; Gas emergency – 129 ; Mobile phones – 112 ."
  },
  {
    "region": "Africa",
    "country": "Equatorial Guinea",
    "police": "116",
    "ambulance": "115",
    "fire": "112",
    "notes": "Traffic police – 116 ."
  },
  {
    "region": "Africa",
    "country": "Eritrea",
    "police": "113",
    "ambulance": "114",
    "fire": "116",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Eswatini",
    "police": "999",
    "ambulance": "977",
    "fire": "933",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Ethiopia",
    "police": "945",
    "ambulance": "907",
    "fire": "939",
    "notes": "Police – 991 ; Ambulance – 907 ; Fire – 939 ; Traffic police – 945 ."
  },
  {
    "region": "Africa",
    "country": "Gabon",
    "police": "1730",
    "ambulance": "1300",
    "fire": "18",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Gambia",
    "police": "112",
    "ambulance": "116",
    "fire": "118",
    "notes": "Police – 112 ; Electricity emergency – 124 ; Water emergency – 125 ."
  },
  {
    "region": "Africa",
    "country": "Ghana",
    "police": "191",
    "ambulance": "193",
    "fire": "192",
    "notes": "Police – 191 ; Ambulance – 193 ; Fire – 192 ."
  },
  {
    "region": "Africa",
    "country": "Guinea",
    "police": "117",
    "ambulance": "18",
    "fire": "442-020",
    "notes": "Maritime Emergency Service – 19 ; Gendarmerie – 118 ; National Gendarmerie – 122"
  },
  {
    "region": "Africa",
    "country": "Guinea-Bissau",
    "police": "117",
    "ambulance": "119",
    "fire": "118",
    "notes": "Police – 117 ; Ambulance – 119 ; Fire – 118 ."
  },
  {
    "region": "Africa",
    "country": "Ivory Coast",
    "police": "110 or 111 or 170",
    "ambulance": "185",
    "fire": "180",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Liberia",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Kenya",
    "police": "112 or 999 or 911",
    "ambulance": "112 or 999 or 911",
    "fire": "112 or 999 or 911",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Libya",
    "police": "1515",
    "ambulance": "193",
    "fire": "1515",
    "notes": "Ambulance – 193 ."
  },
  {
    "region": "Africa",
    "country": "Lesotho",
    "police": "123",
    "ambulance": "121",
    "fire": "122",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Madagascar",
    "police": "3600",
    "ambulance": "124",
    "fire": "118",
    "notes": "Traffic police – 3600 ."
  },
  {
    "region": "Africa",
    "country": "Malawi",
    "police": "990",
    "ambulance": "998",
    "fire": "999",
    "notes": "Police – 990 ."
  },
  {
    "region": "Africa",
    "country": "Mali",
    "police": "17",
    "ambulance": "112 ,",
    "fire": "112",
    "notes": "Ambulance – 112 , Fire – 112 ."
  },
  {
    "region": "Africa",
    "country": "Mauritania",
    "police": "119",
    "ambulance": "101",
    "fire": "118",
    "notes": "Gendarmerie – 116 ; Traffic police – 119 ."
  },
  {
    "region": "Africa",
    "country": "Mauritius",
    "police": "999",
    "ambulance": "114",
    "fire": "995",
    "notes": "Police – 999 ; Fire – 995 ."
  },
  {
    "region": "Africa",
    "country": "Mayotte",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": "Police – 17 ; Ambulance – 15 ; Fire – 18 ."
  },
  {
    "region": "Africa",
    "country": "Morocco",
    "police": "19",
    "ambulance": "15",
    "fire": "15",
    "notes": "Royal gendarmerie – 177 ; Drugs & alcohol service – 113 ; Racial discrimination hotline – 114 ; Non-emergency disturbances – 110 ; General information – 160 ; National Freeway call center – 5050 ; Mobile phones – 112 ."
  },
  {
    "region": "Africa",
    "country": "Mozambique",
    "police": "119",
    "ambulance": "117",
    "fire": "198",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Namibia",
    "police": "10 111",
    "ambulance": "depends on town/city",
    "fire": "depends on town/city",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Niger",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Nigeria",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Réunion",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": "Police – 17 ; Ambulance – 15 ; Fire – 18 ."
  },
  {
    "region": "Africa",
    "country": "Rwanda",
    "police": "113",
    "ambulance": "912",
    "fire": "112",
    "notes": "Traffic police – 113 ."
  },
  {
    "region": "Africa",
    "country": "Saint Helena",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Sao Tome and Principe",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Senegal",
    "police": "17",
    "ambulance": "18",
    "fire": "1515",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Seychelles",
    "police": "133",
    "ambulance": "151",
    "fire": "112 or 999",
    "notes": "Police – 133 ; Ambulance – 151 ."
  },
  {
    "region": "Africa",
    "country": "Sierra Leone",
    "police": "019",
    "ambulance": "999",
    "fire": "999",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Somalia",
    "police": "777",
    "ambulance": "999",
    "fire": "555",
    "notes": "Traffic police – 777 ."
  },
  {
    "region": "Africa",
    "country": "South Africa",
    "police": "10 111",
    "ambulance": "10 177",
    "fire": "10 177",
    "notes": "Emergency in Cape Town – 107 ; Mobile phones – 112 ."
  },
  {
    "region": "Africa",
    "country": "Sudan",
    "police": "777 777",
    "ambulance": "999",
    "fire": "999",
    "notes": "Traffic police – 777 777 ."
  },
  {
    "region": "Africa",
    "country": "South Sudan",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Tanzania",
    "police": "999",
    "ambulance": "114",
    "fire": "115",
    "notes": "Police – 999 ; Health call centre - 199"
  },
  {
    "region": "Africa",
    "country": "Togo",
    "police": "117",
    "ambulance": "8200",
    "fire": "118",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Tristan da Cunha",
    "police": "999",
    "ambulance": "911",
    "fire": "999",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Tunisia",
    "police": "197",
    "ambulance": "190",
    "fire": "198",
    "notes": "National guard – 193 ."
  },
  {
    "region": "Africa",
    "country": "Uganda",
    "police": "999",
    "ambulance": "911",
    "fire": "999",
    "notes": "Police – 999 ; Fire – 999 ."
  },
  {
    "region": "Africa",
    "country": "Western Sahara",
    "police": "150",
    "ambulance": "150",
    "fire": "150",
    "notes": ""
  },
  {
    "region": "Africa",
    "country": "Zambia",
    "police": "911",
    "ambulance": "992",
    "fire": "993",
    "notes": "Police – 911 ; Ambulance – 992 ; Fire – 993 ; Mobile phones – 112 ."
  },
  {
    "region": "Africa",
    "country": "Zimbabwe",
    "police": "995",
    "ambulance": "994",
    "fire": "993",
    "notes": "Police – 995 ; Ambulance – 994 ; Fire – 993 ; Mobile phones – 112 ."
  },
  {
    "region": "America: Caribbean",
    "country": "Anguilla",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Antigua and Barbuda",
    "police": "911 or 999",
    "ambulance": "911 or 999",
    "fire": "911 or 999",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Aruba",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "The Bahamas",
    "police": "911 or 919",
    "ambulance": "911 or 919",
    "fire": "911 or 919",
    "notes": "Mobile phones – 112 ."
  },
  {
    "region": "America: Caribbean",
    "country": "Barbados",
    "police": "211",
    "ambulance": "511",
    "fire": "311",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Bermuda",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "British Virgin Islands",
    "police": "311",
    "ambulance": "911 or 999",
    "fire": "911 or 999",
    "notes": "Police – 311 ."
  },
  {
    "region": "America: Caribbean",
    "country": "Caribbean Netherlands",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Cayman Islands",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Cuba",
    "police": "106",
    "ambulance": "104",
    "fire": "105",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Curacao",
    "police": "911",
    "ambulance": "912",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Dominica",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Dominican Republic",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": "112 redirects to 911 on mobile phones."
  },
  {
    "region": "America: Caribbean",
    "country": "Grenada",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Guadeloupe",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": "Police – 17 ; Ambulance – 15 ; Fire – 18 ."
  },
  {
    "region": "America: Caribbean",
    "country": "Haiti",
    "police": "122",
    "ambulance": "116",
    "fire": "115",
    "notes": "Police – 122 ."
  },
  {
    "region": "America: Caribbean",
    "country": "Jamaica",
    "police": "119",
    "ambulance": "110",
    "fire": "110",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Martinique",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": "Police – 17 ; Ambulance – 15 ; Fire – 18 ."
  },
  {
    "region": "America: Caribbean",
    "country": "Montserrat",
    "police": "911 or 999",
    "ambulance": "911 or 999",
    "fire": "911 or 999",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Puerto Rico",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Saint Barthélemy",
    "police": "17",
    "ambulance": "17",
    "fire": "18",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Saint Kitts and Nevis",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Saint Lucia",
    "police": "911 or 999",
    "ambulance": "911 or 999",
    "fire": "911 or 999",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Saint Martin",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Saint Vincent and the Grenadines",
    "police": "999 or 911 or 112",
    "ambulance": "999 or 911 or 112",
    "fire": "999 or 911 or 112",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Sint Maarten",
    "police": "911",
    "ambulance": "912",
    "fire": "919",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Trinidad and Tobago",
    "police": "999 or 911",
    "ambulance": "811",
    "fire": "990",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "Turks and Caicos",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Caribbean",
    "country": "U.S. Virgin Islands",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Central America",
    "country": "Belize",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "America: Central America",
    "country": "Clipperton Island",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": "Police – 17 ; Ambulance – 15 ; Fire – 18 ."
  },
  {
    "region": "America: Central America",
    "country": "Costa Rica",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": "Mobile phones – 112 ."
  },
  {
    "region": "America: Central America",
    "country": "El Salvador",
    "police": "911",
    "ambulance": "132",
    "fire": "913",
    "notes": ""
  },
  {
    "region": "America: Central America",
    "country": "Guatemala",
    "police": "120",
    "ambulance": "128",
    "fire": "123",
    "notes": "Police – 120 ; Fire – 123 ."
  },
  {
    "region": "America: Central America",
    "country": "Honduras",
    "police": "911",
    "ambulance": "195",
    "fire": "198",
    "notes": ""
  },
  {
    "region": "America: Central America",
    "country": "Nicaragua",
    "police": "118",
    "ambulance": "128",
    "fire": "911",
    "notes": "Fire – 911 ."
  },
  {
    "region": "America: Central America",
    "country": "Panama",
    "police": "104",
    "ambulance": "911",
    "fire": "103",
    "notes": "Police – 104 ; Fire – 103 ."
  },
  {
    "region": "America: North America",
    "country": "Canada",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": "Municipal services – 311 (some areas only). 112 may redirect to 911 on certain mobile phones."
  },
  {
    "region": "America: North America",
    "country": "Mexico",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": "Emergency – 911 ; Anonymous complaint – 089 ."
  },
  {
    "region": "America: North America",
    "country": "Saint Pierre and Miquelon",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": "Police – 17 ; Ambulance – 15 ; Fire – 18 ."
  },
  {
    "region": "America: North America",
    "country": "United States of America",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": "Text-to-9-1-1 is available in many regions and will respond with an error anywhere else. Various services available through regional or national N11 codes (e.g.: 311 for non-emergency police or city services) in certain areas. Calling #77 from a mobile phone may reach the highway patrol in some states. Calling 112 from a mobile phone may redirect to 911 in some states/localities, but emergency officials recommend callers use the standard 911."
  },
  {
    "region": "America: South America",
    "country": "Argentina",
    "police": "101",
    "ambulance": "107",
    "fire": "105",
    "notes": "Police – 101 ; Ambulance – 107 ; Fire – 100 ; Civil defense – 103 ; Forest fire – 105 ; Coast guard – 106 . 112 redirects to 911 on mobile phones."
  },
  {
    "region": "America: South America",
    "country": "Bolivia",
    "police": "120",
    "ambulance": "118",
    "fire": "119",
    "notes": "Police – 110 ; Ambulance – 118 ; Fire – 119 ; Civil protection – 114 ; National police – 120 ."
  },
  {
    "region": "America: South America",
    "country": "Brazil",
    "police": "198",
    "ambulance": "192",
    "fire": "193",
    "notes": "Federal highway police – 191 ; Federal police – 194 ; Civil police – 197 ; State highway police – 198 ; Civil defense – 199 ; Municipal guard – 153 ; Human rights – 100 ; Emergency in Mercosul area – 128 . 112 and 911 redirect to 190 on mobile phones; 188 – Hotline Help."
  },
  {
    "region": "America: South America",
    "country": "Chile",
    "police": "133",
    "ambulance": "131",
    "fire": "132",
    "notes": "Useful mnemonic is ABC123 : A mbulancia (Ambulance) – 13 1 , B omberos (Fire) – 13 2 , C arabineros (Police) – 13 3 . 911 and 112 redirect to 133 ."
  },
  {
    "region": "America: South America",
    "country": "Colombia",
    "police": "112",
    "ambulance": "125",
    "fire": "119",
    "notes": "General emergency - 123; Anti-kidnapping and extortion hotline – 165 ."
  },
  {
    "region": "America: South America",
    "country": "Ecuador",
    "police": "101",
    "ambulance": "131",
    "fire": "102",
    "notes": "Police – 101 ; Ambulance – 131 ; Fire – 102 ; Emergency in Guayaquil – 112 ; Traffic police in Guayaquil – 103 ."
  },
  {
    "region": "America: South America",
    "country": "Falkland Islands",
    "police": "112 or 999",
    "ambulance": "112 or 999",
    "fire": "112 or 999",
    "notes": ""
  },
  {
    "region": "America: South America",
    "country": "French Guiana",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": "Police – 17 ; Ambulance – 15 ; Fire – 18 ."
  },
  {
    "region": "America: South America",
    "country": "Guyana",
    "police": "911",
    "ambulance": "913",
    "fire": "912",
    "notes": "Childcare Protection Agency – 227-0979 ; Human Trafficking – 227-4083, 623-5030 ; Domestic Violence – 914."
  },
  {
    "region": "America: South America",
    "country": "Paraguay",
    "police": "912",
    "ambulance": "141",
    "fire": "132",
    "notes": "Police – 912 ; Ambulance – 141 ; Fire – 132 .; Rescue – 131"
  },
  {
    "region": "America: South America",
    "country": "Peru",
    "police": "105",
    "ambulance": "911",
    "fire": "116",
    "notes": "Police – 105 ; Ambulance (SAMU) – 106 ; Fire – 116 ; Civil defense – 115 ; Domestic violence – 100 ."
  },
  {
    "region": "America: South America",
    "country": "South Georgia and the South Sandwich Islands",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": ""
  },
  {
    "region": "America: South America",
    "country": "Suriname",
    "police": "115",
    "ambulance": "113",
    "fire": "110",
    "notes": "Police – 115 ; Ambulance – 113 ; Fire – 110 ."
  },
  {
    "region": "America: South America",
    "country": "Uruguay",
    "police": "109",
    "ambulance": "105",
    "fire": "104",
    "notes": "Police – 109 ; Ambulance – 105 ; Fire – 104 ."
  },
  {
    "region": "America: South America",
    "country": "Venezuela",
    "police": "911 and 171",
    "ambulance": "911 and 171",
    "fire": "911 and 171",
    "notes": ""
  },
  {
    "region": "Antarctica",
    "country": "Antarctica",
    "police": "McMurdo Station : 911 (fire and medical emergency dispatch)",
    "ambulance": "McMurdo Station : 911 (fire and medical emergency dispatch)",
    "fire": "McMurdo Station : 911 (fire and medical emergency dispatch)",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Abkhazia",
    "police": "102",
    "ambulance": "103",
    "fire": "101",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Afghanistan",
    "police": "119",
    "ambulance": "112",
    "fire": "119",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Bahrain",
    "police": "199 , Coast Guard – 994",
    "ambulance": "999",
    "fire": "999",
    "notes": "Mobile phones – 112 , Traffic police – 199 , Coast Guard – 994 ."
  },
  {
    "region": "Asia",
    "country": "Bangladesh",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": "Anti Corruption Commission – 106 , Agricultural Information Services – 16123 , Health Services – 16263 , Dhaka WASA – 16162 , Women and Children Ministry – 109 , Legal Services – 16430 , National Information Service — 333 , IEDCR Helpline for COVID-19 – 10655"
  },
  {
    "region": "Asia",
    "country": "Bhutan",
    "police": "113",
    "ambulance": "112",
    "fire": "110",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "British Indian Ocean Territory",
    "police": "112 or 999",
    "ambulance": "112 or 999",
    "fire": "112 or 999",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Brunei",
    "police": "993",
    "ambulance": "991",
    "fire": "995",
    "notes": "Search and Rescue – 998"
  },
  {
    "region": "Asia",
    "country": "Cambodia",
    "police": "117",
    "ambulance": "119",
    "fire": "118",
    "notes": "Child helpline – 1280"
  },
  {
    "region": "Asia",
    "country": "People's Republic of China",
    "police": "110",
    "ambulance": "120",
    "fire": "119",
    "notes": "Traffic accident reports – 122 ; Coast guard – 95110"
  },
  {
    "region": "Asia",
    "country": "Christmas Island",
    "police": "000",
    "ambulance": "000",
    "fire": "000",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Cocos Islands",
    "police": "000",
    "ambulance": "000",
    "fire": "000",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "East Timor",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Hong Kong",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": "Mobile phones – 911 or 112 (Automatically redirects to 999 )."
  },
  {
    "region": "Asia",
    "country": "India",
    "police": "100",
    "ambulance": "108",
    "fire": "101",
    "notes": "Gas leakage – 1906 Tourist Helpline – 1363 Child Helpline – 1098 Disaster management – 104 Women Helpline – 181 Police – 100 Ambulance – 108 Fire brigade – 101"
  },
  {
    "region": "Asia",
    "country": "Indonesia",
    "police": "110",
    "ambulance": "118 or 119",
    "fire": "113 or 1131",
    "notes": "Police – 110 ; Ambulance – 118 or 119 ; Fire – 113 or 1131 ; Search & rescue – 115 ; Natural disasters – 129 ; Electricity emergency – 123 ; Mental health – 1-500-454 ."
  },
  {
    "region": "Asia",
    "country": "Iran",
    "police": "110",
    "ambulance": "115",
    "fire": "125",
    "notes": "General emergencies is also 110 . Social Emergency – 123 ; Roads Traffic Information Center – 141 ; Iranian Red Crescent – 112 (non-mobile phones). 112 and 911 redirect to 110 on mobile phones."
  },
  {
    "region": "Asia",
    "country": "Iraq",
    "police": "104",
    "ambulance": "122",
    "fire": "115",
    "notes": "Police – 104 ; Ambulance – 122 ; Fire – 115 ."
  },
  {
    "region": "Asia",
    "country": "Israel",
    "police": "100",
    "ambulance": "101",
    "fire": "102",
    "notes": "Israel Electric Corporation – 103 ; Home Front Command – 104 ; Online child abuse hotline – 105 ; Non-emergency municipal hazards – 106 ; Non-emergency police inquiries – 110 ; Mobile phones – 112 ."
  },
  {
    "region": "Asia",
    "country": "Japan",
    "police": "110",
    "ambulance": "119",
    "fire": "119",
    "notes": "Coast guard – 118 ; Information about emergencies – #7119 free call; Information about emergencies – #9110 pay call; Roadside assistance – #8139 . 112 and 911 redirect to 110 on mobile phones and telephones that are present at all United States military installations ."
  },
  {
    "region": "Asia",
    "country": "Jordan",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": "Mobile phones – 112 ."
  },
  {
    "region": "Asia",
    "country": "Kazakhstan",
    "police": "102",
    "ambulance": "103",
    "fire": "101",
    "notes": "Police – 102 ; Ambulance – 103 ; Fire – 101 ; Gas leaks – 104 ."
  },
  {
    "region": "Asia",
    "country": "Democratic People's Republic of Korea",
    "police": "local numbers only",
    "ambulance": "local numbers only",
    "fire": "110 or 8119",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Republic of Korea",
    "police": "112",
    "ambulance": "119",
    "fire": "119",
    "notes": "Non Emergency – 110 ; National security – 111 ; Reporting spies – 113 ; Narcotics Report – 127 ; Lost and Found Center – 182 ; Travel Hotline – 1330 ."
  },
  {
    "region": "Asia",
    "country": "Kuwait",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Kyrgyzstan",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Laos",
    "police": "191",
    "ambulance": "195",
    "fire": "190",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Lebanon",
    "police": "160",
    "ambulance": "140",
    "fire": "175",
    "notes": "Police – 160 ; Civil defense – 125 ."
  },
  {
    "region": "Asia",
    "country": "Macau",
    "police": "993",
    "ambulance": "999",
    "fire": "999",
    "notes": "From mobile phones – 110 or 112 (all redirects to 999 ); Judiciary Police – 993"
  },
  {
    "region": "Asia",
    "country": "Malaysia",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": "From mobile phones – 112"
  },
  {
    "region": "Asia",
    "country": "Maldives",
    "police": "119",
    "ambulance": "100",
    "fire": "118",
    "notes": "Police – 119 ; Ambulance – 100 ; Fire – 118; Coastguard – 191; For Natural Disasters – 115 ."
  },
  {
    "region": "Asia",
    "country": "Mongolia",
    "police": "102",
    "ambulance": "103",
    "fire": "101",
    "notes": "Police – 102 ; Ambulance – 103 ; Fire – 101 ."
  },
  {
    "region": "Asia",
    "country": "Myanmar",
    "police": "1880",
    "ambulance": "192",
    "fire": "191 (can also call for Natural disasters) Highway",
    "notes": "Police – 199 ; Ambulance – 192 ; Fire – 191 (can also call for Natural disasters) Highway police – 1880 ; Relief – 067-340-4222 (Ministry hotline); International hotline – 122 ; COVID-19 hotline – 2019 ."
  },
  {
    "region": "Asia",
    "country": "Nepal",
    "police": "103",
    "ambulance": "102",
    "fire": "101",
    "notes": "Traffic police – 103 ; From mobile phones – 112 ."
  },
  {
    "region": "Asia",
    "country": "Oman",
    "police": "9999",
    "ambulance": "9999",
    "fire": "9999",
    "notes": "From mobile phones – 112 ."
  },
  {
    "region": "Asia",
    "country": "Pakistan",
    "police": "130",
    "ambulance": "1122",
    "fire": "16",
    "notes": "Ambulance – 1122 ; Traffic police – 1915 ; Mobile phones – 112 ; Punjab Women's toll free helpline – 1043 ; Tourist police – 1422; National Highways & Motorway Police – 130; Child Protection & Welfare Bureau – 1121 ."
  },
  {
    "region": "Asia",
    "country": "Palestine",
    "police": "100",
    "ambulance": "101",
    "fire": "102",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Philippines",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": "Child abuse ( Bantay Bata ) – 163 ; Human trafficking – 1343 ; From mobile phones – 112"
  },
  {
    "region": "Asia",
    "country": "Qatar",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": "Mobile phones – 112 ."
  },
  {
    "region": "Asia",
    "country": "Saudi Arabia",
    "police": "993",
    "ambulance": "997",
    "fire": "998",
    "notes": "Police – 999 ; Ambulance – 997 ; Fire – 998 ; Traffic police – 993 ."
  },
  {
    "region": "Asia",
    "country": "Singapore",
    "police": "6547 0000",
    "ambulance": "1777",
    "fire": "995",
    "notes": "Mobile phones – 112 or 911 ; Non-emergency ambulance – 1777 ; Police hotline – 1800 255 0000 ; Traffic police – 6547 0000 ."
  },
  {
    "region": "Asia",
    "country": "South Ossetia",
    "police": "102",
    "ambulance": "103",
    "fire": "101",
    "notes": ""
  },
  {
    "region": "Asia",
    "country": "Sri Lanka",
    "police": "112 691 111",
    "ambulance": "110",
    "fire": "110",
    "notes": "Traffic police – 112 691 111 ."
  },
  {
    "region": "Asia",
    "country": "Syria",
    "police": "115",
    "ambulance": "110",
    "fire": "113",
    "notes": "Traffic police – 115 ."
  },
  {
    "region": "Asia",
    "country": "Republic of China ( Taiwan )",
    "police": "110",
    "ambulance": "119",
    "fire": "119",
    "notes": "112 on mobile phones – after call is connected 0 redirects 110 and 9 redirects 119; Domestic violence – 113 ; Coast guard – 118"
  },
  {
    "region": "Asia",
    "country": "Tajikistan",
    "police": "102",
    "ambulance": "103",
    "fire": "101",
    "notes": "Police – 102 ; Ambulance – 103 ; Fire – 101 ; Gas leaks – 104 ."
  },
  {
    "region": "Asia",
    "country": "Thailand",
    "police": "1155",
    "ambulance": "1669",
    "fire": "199",
    "notes": "191 will be used as the only national emergency number in the future. Ambulance (Bangkok only) – 1646 ; Tourist police – 1155 ; Traffic control center (Bangkok Metro only) – 1197 ; Highway patrol – 1193 ; Mobile Phones – 112."
  },
  {
    "region": "Asia",
    "country": "Turkmenistan",
    "police": "002",
    "ambulance": "003",
    "fire": "001",
    "notes": "For mobile phones: Fire - 001 ; Police - 002 ; Ambulance - 003 ; Gas leak - 004 . For gas leaks - 04 on landline."
  },
  {
    "region": "Asia",
    "country": "United Arab Emirates",
    "police": "901",
    "ambulance": "998",
    "fire": "997",
    "notes": "Coast guard – 996 ; Non-emergency police – 901 ; Water failure – 922; Electricity failure – 991"
  },
  {
    "region": "Asia",
    "country": "Uzbekistan",
    "police": "102",
    "ambulance": "103",
    "fire": "101",
    "notes": "Emergency service – 1050 ; Gas leaks – 104 ; Housing and communal services – 1055 . 112 is being introduced as the number for all emergencies on 1 January 2024 in Uzbekistan by the end of 2024."
  },
  {
    "region": "Asia",
    "country": "Vietnam",
    "police": "113",
    "ambulance": "115",
    "fire": "114",
    "notes": "111 – Child abuse, 112 – Livesaving services"
  },
  {
    "region": "Asia",
    "country": "Yemen",
    "police": "194",
    "ambulance": "191",
    "fire": "191",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Akrotiri and Dhekelia",
    "police": "112 or 999",
    "ambulance": "112 or 999",
    "fire": "112 or 999",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Åland Islands",
    "police": "018 527 100",
    "ambulance": "112",
    "fire": "112",
    "notes": "Non-emergency police – 018 527 100 ; Poison control – 09 471 977 ."
  },
  {
    "region": "Europe",
    "country": "Albania",
    "police": "126",
    "ambulance": "112",
    "fire": "128",
    "notes": "Traffic police – 126 ; Emergency at sea – 125 . Mobile phones ambulance – 112"
  },
  {
    "region": "Europe",
    "country": "Andorra",
    "police": "110",
    "ambulance": "116",
    "fire": "118",
    "notes": "112 – Mountain / Sky Rescue collaboration with Spanish (Catalan) and French authorities"
  },
  {
    "region": "Europe",
    "country": "Armenia",
    "police": "177",
    "ambulance": "103",
    "fire": "101",
    "notes": "Police – 102 ; Ambulance – 103 ; Fire – 101 ; Gas emergency – 104 ; Traffic police – 177 ; Search & rescue – 108 ."
  },
  {
    "region": "Europe",
    "country": "Austria",
    "police": "112",
    "ambulance": "144",
    "fire": "122",
    "notes": "Gas emergency – 128 ; Mountain rescue – 140 ; Doctors – 141 ; Crisis hotline – 142 ; Support for children and teens – 147 ; Non-emergency police – 059 133 ; Deaf fax/SMS – 0800 133 133 ; Poisoning Informations Center – 01 406 43 43 . The emergency telephone number 112 will be answered by the police, but will also handle other emergency services."
  },
  {
    "region": "Europe",
    "country": "Azerbaijan",
    "police": "902",
    "ambulance": "112 or 103",
    "fire": "112 or 101",
    "notes": "Gas Service – 104 ; Traffic police – 902 ; Electricity emergency – 199 ; Emergency – 112 ."
  },
  {
    "region": "Europe",
    "country": "Belarus",
    "police": "102",
    "ambulance": "103",
    "fire": "101",
    "notes": "Gas emergency – 104 ."
  },
  {
    "region": "Europe",
    "country": "Belgium",
    "police": "101 or 112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Non-emergency number for the fire department – 1722 ."
  },
  {
    "region": "Europe",
    "country": "Bosnia and Herzegovina",
    "police": "122",
    "ambulance": "124",
    "fire": "123",
    "notes": "Civil protection – 121 ."
  },
  {
    "region": "Europe",
    "country": "Bulgaria",
    "police": "112 or 166",
    "ambulance": "112 or 150",
    "fire": "112 or 160",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Croatia",
    "police": "112 or 192",
    "ambulance": "112 or 194",
    "fire": "112 or 193",
    "notes": "Search and rescue at sea – 112 or 195 ; Road help – 1987 ."
  },
  {
    "region": "Europe",
    "country": "Cyprus",
    "police": "112 or 199",
    "ambulance": "112 or 199",
    "fire": "112 or 199",
    "notes": "Air/sea rescue – 1441 ; Anti-drug support – 1410 or 1498 ; Poison control – 1401 ."
  },
  {
    "region": "Europe",
    "country": "Czech Republic",
    "police": "112",
    "ambulance": "112 or 155",
    "fire": "112 or 150",
    "notes": "Municipal police – 156 ."
  },
  {
    "region": "Europe",
    "country": "Denmark",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Non-emergency police – 114 ."
  },
  {
    "region": "Europe",
    "country": "Estonia",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Faroe Islands",
    "police": "114",
    "ambulance": "112",
    "fire": "112",
    "notes": "Non-emergency police – 114 ."
  },
  {
    "region": "Europe",
    "country": "Finland",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Maritime rescue – 02 94 1000 ; Poison Control – 0800 147 111 ; Medical Helpline 116117 (except in Lapland and Åland ); Report lost or stolen credit card 020 333 (for most Finnish banks)"
  },
  {
    "region": "Europe",
    "country": "France",
    "police": "112 or 17",
    "ambulance": "112 or 15",
    "fire": "112 or 18",
    "notes": "Deaf FAX/SMS – 114 ; Hotline for beaten children – 119 ; Missing children – 116 000 ; Maritime rescue – 196 . in 80% of departments 112 will redirect to fire and rescue service in the rest of cases 112 will be handled either by a common platform or by ambulance (SAMU)"
  },
  {
    "region": "Europe",
    "country": "Georgia",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Germany",
    "police": "110",
    "ambulance": "112",
    "fire": "112",
    "notes": "Traditionally 110 for the police and 112 for the fire brigade and rescue service. Due to EU Directive 112 works also for the police; 911 redirects to 112 on telephones used in USAFE bases. Rescue service additionally (outdating) 19222 . Non-emergency medical on-call duty: 116 117 . Debit and credit card locking call 116 116 . Military police: 0800 190 9999 . Federal (incl. railway) police: 0800 6 888 000 ."
  },
  {
    "region": "Europe",
    "country": "Gibraltar",
    "police": "199 or 112 or 999",
    "ambulance": "190 or 112 or 999",
    "fire": "190 or 112 or 999",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Greece",
    "police": "112",
    "ambulance": "166",
    "fire": "112",
    "notes": "General emergencies – 112 ; Forest fire – 1591 ; Coast guard – 108 ; Counter-narcotics – 109 ; Tourist police – 171 ; Social aid – 197 ."
  },
  {
    "region": "Europe",
    "country": "Greenland",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Mobile phones only. From landline phones dial the local police station, hospital or fire brigade."
  },
  {
    "region": "Europe",
    "country": "Guernsey",
    "police": "112 or 999",
    "ambulance": "112 or 999",
    "fire": "112 or 999",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Hungary",
    "police": "112 or 107",
    "ambulance": "112 or 104",
    "fire": "112 or 105",
    "notes": "Water emergency – 1817 ."
  },
  {
    "region": "Europe",
    "country": "Iceland",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Non-emergency police Reykjavík area – 444 10 00 ; 911 redirects to 112 on mobile phones; +354 570 2112 from abroad."
  },
  {
    "region": "Europe",
    "country": "Ireland",
    "police": "112 or 999",
    "ambulance": "112 or 999",
    "fire": "112 or 999",
    "notes": "SMS messages can be sent to 112 ."
  },
  {
    "region": "Europe",
    "country": "Isle of Man",
    "police": "112 or 999",
    "ambulance": "112 or 999",
    "fire": "112 or 999",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Italy",
    "police": "112",
    "ambulance": "118",
    "fire": "115",
    "notes": "Older system, still in use in four regions ( Veneto , Molise , Campania and Basilicata ): Police – 113 ; Carabinieri – 112 ; Ambulance – 118 ; Fire – 115 ; Forest service – 1515 ; Customs/Financial police – 117 ; Child Abuse – 114 ; Coast guard – 1530 . 911 redirects to 112 ."
  },
  {
    "region": "Europe",
    "country": "Jersey",
    "police": "112 or 999",
    "ambulance": "112 or 999",
    "fire": "112 or 999",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Kosovo",
    "police": "192",
    "ambulance": "194",
    "fire": "193",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Latvia",
    "police": "110",
    "ambulance": "113",
    "fire": "112",
    "notes": "Police – 110 ; Ambulance – 113 ; Gas emergency – 114 ."
  },
  {
    "region": "Europe",
    "country": "Lithuania",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Call 112 for emergency services."
  },
  {
    "region": "Europe",
    "country": "Liechtenstein",
    "police": "117",
    "ambulance": "144",
    "fire": "118",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Luxembourg",
    "police": "113",
    "ambulance": "112",
    "fire": "112",
    "notes": "Police – 113 ."
  },
  {
    "region": "Europe",
    "country": "Malta",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Moldova",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Monaco",
    "police": "17",
    "ambulance": "112 or 18",
    "fire": "112 or 18",
    "notes": "112 and 18 redirects to fire and rescue service which can also handle ambulance service"
  },
  {
    "region": "Europe",
    "country": "Montenegro",
    "police": "122 or 112",
    "ambulance": "124 or 112",
    "fire": "123 or 112",
    "notes": "Emergency at sea: 129"
  },
  {
    "region": "Europe",
    "country": "Netherlands",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Text phone – 0800 81 12 ; Non-emergency police – 0900 88 44 or 0343 578 844 ; Non-emergency police (text phone) – 0900 18 44 ; Suicide prevention – 0800-0113 ; Animal emergency – 144 ; Child abuse – 0900 123 12 30 ; Anti-bullying hotline – 0800 90 50 ."
  },
  {
    "region": "Europe",
    "country": "North Macedonia",
    "police": "192",
    "ambulance": "194",
    "fire": "193",
    "notes": "Police – 192 ; Ambulance – 194 ; Fire – 193 ."
  },
  {
    "region": "Europe",
    "country": "Northern Cyprus",
    "police": "155",
    "ambulance": "112",
    "fire": "177",
    "notes": "Forest Fire – 177 ; Coast Guard – 158 ; Civil Defense – 101 ."
  },
  {
    "region": "Europe",
    "country": "Norway",
    "police": "112",
    "ambulance": "113",
    "fire": "110",
    "notes": "Emergency at sea: 120 ; non-emergency police: 02 800 ; child abuse and family violence: 116 111 ; text phone: 1412 ; nearest health care outside office hours: 116 117 ; 911 redirects to 112 ."
  },
  {
    "region": "Europe",
    "country": "Poland",
    "police": "997 or 112",
    "ambulance": "999 or 112",
    "fire": "998 or 112",
    "notes": "Road help – 981 , Elevator emergency – 982 , Veterinary emergency – 983 , Rescue on lakes and rivers – 984 or +48 601 100 100 , Sea and mountain rescue – 985 or +48 601 100 300 , Municipal police (where operating) – 986 , Crisis Management Centre (focus depends on voivodeship) – 987 , Electricity emergency – 991 , Gas emergency – 992 , Heat engineering emergency – 993 , Water emergency – 994 , Child alert (operated by Police) – 995 , Counterterrorism emergency – 996 , Missing children (EU hotline) – 116 000 Warsaw additionally maintains some local emergency numbers. 911 redirects to 112 ."
  },
  {
    "region": "Europe",
    "country": "Portugal",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Forest fire – 117 ; Social emergency – 144 . 911 redirects to 112 on telephones located at Lajes Air Station ."
  },
  {
    "region": "Europe",
    "country": "Romania",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "911 redirects to 112"
  },
  {
    "region": "Europe",
    "country": "Russia",
    "police": "102 or 112",
    "ambulance": "103 or 112",
    "fire": "101 or 112",
    "notes": "Gas emergency – 104 ; 112 came into effect (for any emergency) in 2013"
  },
  {
    "region": "Europe",
    "country": "San Marino",
    "police": "113",
    "ambulance": "118",
    "fire": "115",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Serbia",
    "police": "192 or 112",
    "ambulance": "194",
    "fire": "193",
    "notes": "Civil protection – 1985 ; 112 redirects to 192 . It is possible to dial 112 and get direct connection with the emergency services by pressing 1 for police, 2 for ambulance and 3 for fire on Vip operator mobile phones."
  },
  {
    "region": "Europe",
    "country": "Slovakia",
    "police": "112",
    "ambulance": "155",
    "fire": "150",
    "notes": "Municipal police – 159 ."
  },
  {
    "region": "Europe",
    "country": "Slovenia",
    "police": "113",
    "ambulance": "112",
    "fire": "112",
    "notes": "Police – 113 ; Road help – 1987 ; Emergency at sea – 080 18 00 ."
  },
  {
    "region": "Europe",
    "country": "Spain",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Police: National Police – 091 ; Civil Guard – 062 ; Autonomic Police – 112 ; Municipal Police – 092 . Fire: Local Firefighters – 080 ; Autonomic Firefighters – 085 . Ambulance: SAMUR – 061 . Others: Civil Protection – 1006 , Maritime Rescue – 902 202 202 ; Red Cross – 901 222 222 ."
  },
  {
    "region": "Europe",
    "country": "Sweden",
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "notes": "Non-emergency police – 114 14 ; Non-emergency medical advice – 1177 ; Information during accidents and crises – 113 13 ."
  },
  {
    "region": "Europe",
    "country": "Switzerland",
    "police": "117",
    "ambulance": "144",
    "fire": "118",
    "notes": "Poison control – 145 ; Road help – 0800 140 140 ; Psychological support – 143 ; Psychological support for teens and children – 147 ; Rega air rescue – 1414 or by radio on 161.300 MHz; Air Glaciers air-rescue ( Valais only) – 1415 . The emergency number 112 is used differently based on the Canton . While in some cantons 112, 117, 118 and 114 are routed to a common emergency call center, in other cantons 112 together with 117 is directly routed to the police."
  },
  {
    "region": "Europe",
    "country": "Transnistria",
    "police": "102",
    "ambulance": "103",
    "fire": "101",
    "notes": ""
  },
  {
    "region": "Europe",
    "country": "Turkey",
    "police": "153 ( 112 connects to national police )",
    "ambulance": "112",
    "fire": "112",
    "notes": "Municipal police – 153 ( 112 connects to national police ) ; Gas emergency and outages – 187 ; Electricity emergency and outages – 186 ; Water emergency and outages – 185 ; Non-emergency medical consultation - 184 ; Child abuse and family violence – 183 ; Telephone emergency and outages – 121 ; Poison control – 114 . 911 automatically connects to 112. Current service is the result of consolidation of firefighter, emergency police, Gendarmerie , Coast Guard , forest fire, search and rescue, natural disaster and medical emergency numbers into medical emergency former solo number 112 ."
  },
  {
    "region": "Europe",
    "country": "Ukraine",
    "police": "102",
    "ambulance": "103",
    "fire": "101",
    "notes": "General emergencies – 112 ; Gas emergency – 104 ."
  },
  {
    "region": "Europe",
    "country": "United Kingdom",
    "police": "999",
    "ambulance": "999 or 112",
    "fire": "999 or 112",
    "notes": "Non-emergency police – 101 ; Power outages – 105 ; Non-emergency health issues – 111 ; COVID-19 testing helpline – 119 ; gas leaks – 0800 111 999 . SMS messages can be sent to 999 after registration by sending a text message with the word 'Register' to 999 . 911 redirects to 999 on mobile phones/public phonebooths and on telephones used in USAFE bases."
  },
  {
    "region": "Europe",
    "country": "Vatican City",
    "police": "113",
    "ambulance": "118",
    "fire": "115",
    "notes": "Police – 113 ; Ambulance – 118 ; Fire – 115 ."
  },
  {
    "region": "Oceania",
    "country": "American Samoa",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Australia",
    "police": "000",
    "ambulance": "000",
    "fire": "000",
    "notes": "Mobile phones – 112 or 000 ; State Emergency Service – 132 500 ; National relay service – 106 ; Non-emergency police – 131 444 ( NSW , QLD , VIC , SA , WA , NT , TAS & ACT ); Crime Stoppers – 1800 333 000 ; Threats to national security – 1800 123 400 ; Poison control – 13 11 26 ; Lifeline – 13 11 14 ."
  },
  {
    "region": "Oceania",
    "country": "Cook Islands",
    "police": "999",
    "ambulance": "999",
    "fire": "999",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Fiji",
    "police": "917",
    "ambulance": "911",
    "fire": "910",
    "notes": "Police – 917 ; Fire – 910 ; Crime Stoppers – 919 ."
  },
  {
    "region": "Oceania",
    "country": "French Polynesia",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": "Police – 17 ; Ambulance – 15 ; Fire – 18 ."
  },
  {
    "region": "Oceania",
    "country": "Guam",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Kiribati",
    "police": "192",
    "ambulance": "194 and 195",
    "fire": "193",
    "notes": "Police – 192 ; Ambulance – 194 and 195 ; Fire – 193 ."
  },
  {
    "region": "Oceania",
    "country": "Marshall Islands",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Micronesia",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Nauru",
    "police": "110",
    "ambulance": "111",
    "fire": "112",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "New Caledonia",
    "police": "17",
    "ambulance": "15",
    "fire": "18",
    "notes": "Police – 17 ; Ambulance – 15 ; Fire – 18 ."
  },
  {
    "region": "Oceania",
    "country": "New Zealand",
    "police": "111",
    "ambulance": "111",
    "fire": "111",
    "notes": "SMS messages can be sent to 111 from registered mobile phones. Traffic – *555 (mobile phones only). 112 and 911 redirect to 111 on mobile phones. Dialing 000 and 999 plays a pre-recorded message advising the caller to call 111 . Crime Stoppers – 0800 555 111 . Police non-emergency – 105 ."
  },
  {
    "region": "Oceania",
    "country": "Niue",
    "police": "(+683) 4333",
    "ambulance": "(+683) 4202",
    "fire": "(+683) 4133",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Northern Mariana Islands",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Palau",
    "police": "911",
    "ambulance": "911",
    "fire": "911",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Papua New Guinea",
    "police": "112",
    "ambulance": "111",
    "fire": "110",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Samoa",
    "police": "995",
    "ambulance": "996",
    "fire": "994",
    "notes": "Police – 995 ; Ambulance – 996 ; Fire – 994 ."
  },
  {
    "region": "Oceania",
    "country": "Solomon Islands",
    "police": "999",
    "ambulance": "111",
    "fire": "988",
    "notes": "Police – 999 ; Ambulance – 111 ; Fire – 988 . In cities, local numbers exist which connect more quickly than either 911 or 999 ."
  },
  {
    "region": "Oceania",
    "country": "Tokelau",
    "police": "(+690) 2116",
    "ambulance": "(+690) 2112",
    "fire": "",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Tonga",
    "police": "922",
    "ambulance": "933",
    "fire": "999",
    "notes": "Police – 922 ; Ambulance – 933 ; Fire – 999 ."
  },
  {
    "region": "Oceania",
    "country": "Tuvalu",
    "police": "911",
    "ambulance": "999",
    "fire": "000",
    "notes": "Police – 911 ; Ambulance – 999 ; Fire – 000 ."
  },
  {
    "region": "Oceania",
    "country": "Vanuatu",
    "police": "111",
    "ambulance": "112",
    "fire": "113",
    "notes": ""
  },
  {
    "region": "Oceania",
    "country": "Wallis and Futuna",
    "police": "15",
    "ambulance": "15",
    "fire": "15",
    "notes": ""
  }
]

export default emergencyNumbersByCountry;
