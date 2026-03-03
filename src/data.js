// src/data.js

// --- BAZA DANYCH IMION I NAZWISK (Różne narodowości) ---
const NAME_DB = {
  'AT': {
  first: [
    "David", "Marcel", "Marko", "Konrad", "Christoph", "Xaver", "Michael", 
    "Stefan", "Kevin", "Nicolas", "Patrick", "Alexander", "Florian", "Gernot", 
    "Martin", "Andreas", "Toni", "Hans", "Herbert", "Matthias", "Ivica", 
    "Julian", "Romano", "Philipp", "Sasa", "Maximilian", "Dejan", "Manfred"
  ],
  last: [
    "Alaba", "Sabitzer", "Arnautović", "Laimer", "Baumgartner", "Schlager", 
    "Gregoritsch", "Posch", "Danso", "Seiwald", "Wimmer", "Pentz", "Grillitsch", 
    "Trauner", "Lienhart", "Hinteregger", "Polster", "Krankl", "Herzog", 
    "Prohaska", "Sindelar", "Vastic", "Kalajdzic", "Schmid", "Mwene", "Ilsanker", "Dragovic", "Konsel"
  ],
  },

    'PL': {
  first: [
    "Robert", "Wojciech", "Piotr", "Jakub", "Arkadiusz", "Grzegorz", "Zbigniew", 
    "Kamil", "Łukasz", "Jan", "Włodzimierz", "Kazimierz", "Matty", "Nicola", 
    "Sebastian", "Przemysław", "Krzysztof", "Michał", "Bartosz", "Karol", 
    "Adam", "Jerzy", "Euzebiusz", "Artur", "Tomasz", "Marek", "Andrzej", "Jacek"
  ],
  last: [
    "Lewandowski", "Szczęsny", "Zieliński", "Błaszczykowski", "Milik", "Boniek", 
    "Lato", "Deyna", "Lubański", "Piszczek", "Glik", "Krychowiak", "Fabiański", 
    "Dudek", "Boruc", "Bednarek", "Kiwior", "Cash", "Zalewski", "Frankowski", 
    "Szymański", "Piątek", "Świderski", "Smolarek", "Tomaszewski", "Żmuda", "Gorgon", "Szarmach"
  ]
},
    'GB-ENG': {
  first: [
    "Harry", "Jude", "Bukayo", "Phil", "Wayne", "David", "Steven", "Frank", 
    "Raheem", "Marcus", "Trent", "Declan", "Jordan", "Kyle", "John", "Alan", 
    "Gary", "Bobby", "Jack", "Cole", "Mason", "Reece", "Rio", "Paul", 
    "Michael", "Luke", "Kieran", "Ollie"
  ],
  last: [
    "Kane", "Bellingham", "Saka", "Foden", "Rooney", "Beckham", "Gerrard", 
    "Lampard", "Sterling", "Rashford", "Rice", "Pickford", "Walker", "Stones", 
    "Shearer", "Lineker", "Charlton", "Moore", "Grealish", "Palmer", "Mount", 
    "James", "Ferdinand", "Scholes", "Owen", "Shaw", "Trippier", "Watkins"
  ]
},
    'ES': {
  first: [
    "Iker", "Andrés", "Xavi", "Sergio", "Carles", "Fernando", "David", "Raúl", 
    "Gerard", "Cesc", "Isco", "Jordi", "Sergio", "Dani", "Rodri", "Pedri", 
    "Gavi", "Lamine", "Nico", "Alvaro", "Unai", "Pau", "Aymeric", "Ferran", 
    "Marc", "Luis", "Pep", "Xabi"
  ],
  last: [
    "Casillas", "Iniesta", "Hernández", "Ramos", "Puyol", "Torres", "Villa", 
    "González", "Piqué", "Fàbregas", "Alarcón", "Alba", "Busquets", "Carvajal", 
    "Cascante", "González", "Yamal", "Williams", "Morata", "Simón", "Cubarsí", 
    "Laporte", "Olmo", "Cucurella", "Suárez", "Guardiola", "Alonso", "De Gea"
  ]
},
'DE': {
  first: [
    "Manuel", "Thomas", "Toni", "Bastian", "Philipp", "Miroslav", "Lukas", 
    "Mesut", "Mats", "Marco", "Ilkay", "Joshua", "Kai", "Jamal", "Florian", 
    "Leroy", "Antonio", "Serge", "Niclas", "Oliver", "Lothar", "Franz", "Gerd", 
    "Jürgen", "Rudi", "Michael", "Sami", "Mario"
  ],
  last: [
    "Neuer", "Müller", "Kroos", "Schweinsteiger", "Lahm", "Klose", "Podolski", 
    "Özil", "Hummels", "Reus", "Gündoğan", "Kimmich", "Havertz", "Musiala", 
    "Wirtz", "Sané", "Rüdiger", "Gnabry", "Füllkrug", "Kahn", "Matthäus", 
    "Beckenbauer", "Klinsmann", "Völler", "Ballack", "Khedira", "Götze", "Ter Stegen"
  ]
},
'IT': {
  first: [
    "Gianluigi", "Paolo", "Alessandro", "Francesco", "Andrea", "Fabio", 
    "Giorgio", "Leonardo", "Gennaro", "Roberto", "Filippo", "Christian", 
    "Daniele", "Marco", "Federico", "Nicolo", "Gianluca", "Lorenzo", "Ciro", 
    "Riccardo", "Davide", "Alessandro", "Jorginho", "Dino", "Franco", "Giuseppe", "Antonio", "Sandro"
  ],
  last: [
    "Buffon", "Maldini", "Del Piero", "Totti", "Pirlo", "Cannavaro", "Chiellini", 
    "Bonucci", "Gattuso", "Baggio", "Inzaghi", "Vieri", "De Rossi", "Verratti", 
    "Chiesa", "Barella", "Donnarumma", "Insigne", "Immobile", "Calafiori", 
    "Bastoni", "Nesta", "Frello", "Zoff", "Baresi", "Meazza", "Di Natale", "Tonali"
  ]
},
   'BR': {
  first: [
    "Neymar", "Vinícius", "Rodrygo", "Gabriel", "Alisson", "Ederson", "Thiago", 
    "Marcos", "Roberto", "Ronaldo", "Rivaldo", "Romário", "Cafu","Pele","Marcelo", 
    "Dani", "Philippe", "Endrick", "Richarlison", "Raphinha", "Antony", "Lucas", 
    "Bruno", "Vitor", "Savinho", "Douglas", "Arthur", "Fred", "Oscar"
  ],
  last: [
    "Júnior", "Silva", "Santos", "Jesus", "Martinelli", "Guimarães", "Paquetá", 
    "Militão", "Marquinhos", "Casemiro", "Firmino", "Coutinho", "Alves", 
    "Carlos", "Lima", "Oliveira", "Souza", "Pereira", "Ferreira", "Rodrigues", 
    "Barbosa", "Moura", "Luiz", "Roque", "Costa", "Melo", "Teixeira", "Ribeiro"
  ]
},
    'FR': {
  first: [
    "Kylian", "Antoine", "Karim", "Thierry", "Zinedine", "Olivier", "Paul", 
    "Hugo", "Raphaël", "Ousmane", "Kingsley", "N'Golo", "Lucas", "Theo", 
    "Jules", "Adrien", "Eduardo", "Aurélien", "Randal", "William", "Dayot", 
    "Ibrahima", "Benjamin", "Ferland", "Mike", "Michel", "Patrick", "Laurent"
  ],
  last: [
    "Mbappé", "Griezmann", "Benzema", "Henry", "Zidane", "Giroud", "Pogba", 
    "Lloris", "Varane", "Dembélé", "Coman", "Kanté", "Hernandez", "Koundé", 
    "Rabiot", "Camavinga", "Tchouaméni", "Kolo Muani", "Saliba", "Upamecano", 
    "Konaté", "Pavard", "Mendy", "Maignan", "Platini", "Vieira", "Blanc", "Thuram"
  ]
},
'GB-WLS': {
  first: [
    "Gareth", "Aaron", "Ben", "Daniel", "Harry", "Brennan", "Neco", "Kieffer", 
    "Ethan", "Joe", "Connor", "Chris", "Wayne", "Ian", "Ryan", "Gary", "Mark", 
    "Neville", "Hal", "David", "Robert", "John", "Robbie", "Craig", "Ashley", 
    "Sorba", "Rabbi", "Danny"
  ],
  last: [
    "Bale", "Ramsey", "Davies", "James", "Wilson", "Johnson", "Williams", 
    "Moore", "Ampadu", "Rodon", "Allen", "Brooks", "Roberts", "Mepham", 
    "Rush", "Giggs", "Speed", "Southall", "Bellamy", "Gunter", "Hennessey", 
    "Savage", "Toshack", "Saundros", "Charles", "Yorath", "Ledley", "Vokes"
  ]
},
'GB-SCT': {
  first: [
    "Kenny", "Andy", "Scott", "John", "Kieran", "Graeme", "Denis", "Ally", 
    "Gordon", "Darren", "James", "Billy", "Che", "Ryan", "Callum", "Lewis", 
    "Aaron", "Nathan", "Stuart", "Ross", "Craig", "Archie", "Paul", "Steven", 
    "Gary", "Barry", "Kevin", "Lyndon"
  ],
  last: [
    "Dalglish", "Robertson", "McTominay", "McGinn", "Tierney", "Souness", 
    "Law", "McCoist", "Strachan", "Fletcher", "McFadden", "Gilmour", "Adams", 
    "Christie", "McGregor", "Ferguson", "Patterson", "Hickey", "Armstrong", 
    "Stewart", "Gordon", "Gemmill", "Lambert", "Naismith", "McAllister", "Boyd", "Miller", "Dykes"
  ]
},
'GB-NIR': {
  first: [
    "George", "Jonny", "Steven", "Pat", "Kyle", "Stuart", "Paddy", "Conor", 
    "Norman", "Martin", "Aaron", "David", "Chris", "Gareth", "Jamal", "Josh", 
    "Corry", "Niall", "Bailey", "Shea", "Ali", "Dion", "Isaac", "Trai", 
    "Harry", "Gerry", "Sammy", "Liam"
  ],
  last: [
    "Best", "Evans", "Davis", "Jennings", "Lafferty", "Dallas", "McNair", 
    "Bradley", "Whiteside", "O'Neill", "Hughes", "Healy", "Brunt", "McAuley", 
    "Lewis", "Magennis", "Washington", "Charles", "Peacock-Farrell", "Hume", 
    "McCann", "Price", "Saville", "Thompson", "Gregg", "Armstrong", "Baird", "Gillespie"
  ]
}

};

export const SCOUTING_REGIONS = [
    { id: 'PL', name: 'Polska', cost: 50000 },
    { id: ['GB-ENG','GB-WLS', 'GB-SCT','GB-NIR'], name: 'Wyspy Brytyjskie', cost: 250000 },
    { id: 'ES', name: 'Półwysep Iberyjski', cost: 200000 },
    { id: ['DE','AT'], name: 'Niemcy / Austria', cost: 180000 },
    { id: 'IT', name: 'Włochy', cost: 190000 },
    { id: 'BR', name: 'Ameryka Płd.', cost: 350000 },
    { id: 'FR', name: 'Francja', cost: 300000},
];

export const TEAMS_DATA = [
    // POLSKA 1LIGA
  { id: 1, name: 'Jagiellonia Białystok', country: 'PL', league: 1, attack: 72, defense: 69 },
  { id: 2, name: 'Śląsk Wrocław', country: 'PL', league: 1, attack: 68, defense: 70 },
  { id: 3, name: 'Legia Warszawa', country: 'PL', league: 1, attack: 70, defense: 71 },
  { id: 4, name: 'Pogoń Szczecin', country: 'PL', league: 1, attack: 71, defense: 68 },
  { id: 5, name: 'Lech Poznań', country: 'PL', league: 1, attack: 70, defense: 70 },
  { id: 6, name: 'Górnik Zabrze', country: 'PL', league: 1, attack: 67, defense: 66 },
  { id: 7, name: 'Raków Częstochowa', country: 'PL', league: 1, attack: 69, defense: 73 },
  { id: 8, name: 'Zagłębie Lubin', country: 'PL', league: 1, attack: 66, defense: 66 },
  { id: 9, name: 'Widzew Łódź', country: 'PL', league: 1, attack: 67, defense: 65 },
  { id: 10, name: 'Piast Gliwice', country: 'PL', league: 1, attack: 65, defense: 68 },
  { id: 11, name: 'Stal Mielec', country: 'PL', league: 1, attack: 64, defense: 65 },
  { id: 12, name: 'Puszcza Niepołomice', country: 'PL', league: 1, attack: 62, defense: 64 },
  { id: 13, name: 'Cracovia', country: 'PL', league: 1, attack: 66, defense: 66 },
  { id: 14, name: 'Korona Kielce', country: 'PL', league: 1, attack: 63, defense: 64 },
  { id: 15, name: 'Radomiak Radom', country: 'PL', league: 1, attack: 64, defense: 63 },
  { id: 16, name: 'Lechia Gdańsk', country: 'PL', league: 1, attack: 65, defense: 64 },
  { id: 17, name: 'GKS Katowice', country: 'PL', league: 1, attack: 63, defense: 63 },
  { id: 18, name: 'Motor Lublin', country: 'PL', league: 1, attack: 62, defense: 62 },
  // 2 LIGAPOLSKA
  { id: 19, name: 'Wisła Kraków', country: 'PL', league: 2, attack: 69, defense: 66 },
  { id: 20, name: 'Arka Gdynia', country: 'PL', league: 2, attack: 68, defense: 68 },
  { id: 21, name: 'Ruch Chorzów', country: 'PL', league: 2, attack: 67, defense: 67 },
  { id: 22, name: 'ŁKS Łódź', country: 'PL', league: 2, attack: 67, defense: 66 },
  { id: 23, name: 'Bruk-Bet Termalica', country: 'PL', league: 2, attack: 70, defense: 68 },
  { id: 24, name: 'Wisła Płock', country: 'PL', league: 2, attack: 67, defense: 66 },
  { id: 25, name: 'Miedź Legnica', country: 'PL', league: 2, attack: 66, defense: 65 },
  { id: 26, name: 'Górnik Łęczna', country: 'PL', league: 2, attack: 65, defense: 66 },
  { id: 27, name: 'GKS Tychy', country: 'PL', league: 2, attack: 64, defense: 65 },
  { id: 28, name: 'Odra Opole', country: 'PL', league: 2, attack: 64, defense: 64 },
  { id: 29, name: 'Stal Rzeszów', country: 'PL', league: 2, attack: 66, defense: 63 },
  { id: 30, name: 'Warta Poznań', country: 'PL', league: 2, attack: 63, defense: 64 },
  { id: 31, name: 'Polonia Warszawa', country: 'PL', league: 2, attack: 63, defense: 62 },
  { id: 32, name: 'Znicz Pruszków', country: 'PL', league: 2, attack: 62, defense: 63 },
  { id: 33, name: 'Chrobry Głogów', country: 'PL', league: 2, attack: 61, defense: 62 },
  { id: 34, name: 'Kotwica Kołobrzeg', country: 'PL', league: 2, attack: 64, defense: 63 },
  { id: 35, name: 'Pogoń Siedlce', country: 'PL', league: 2, attack: 60, defense: 61 },
  { id: 36, name: 'Stal Stalowa Wola', country: 'PL', league: 2, attack: 59, defense: 60 },
  // 3LIGA POLSKA
  { id: 37, name: 'Wieczysta Kraków', country: 'PL', league: 3, attack: 68, defense: 65 },
  { id: 38, name: 'Polonia Bytom', country: 'PL', league: 3, attack: 67, defense: 64 },
  { id: 39, name: 'Pogoń Grodzisk Mazowiecki', country: 'PL', league: 3, attack: 66, defense: 65 },
  { id: 40, name: 'Podbeskidzie Bielsko-Biała', country: 'PL', league: 3, attack: 64, defense: 63 },
  { id: 41, name: 'Zagłębie Sosnowiec', country: 'PL', league: 3, attack: 63, defense: 62 },
  { id: 42, name: 'Resovia Rzeszów', country: 'PL', league: 3, attack: 62, defense: 62 },
  { id: 43, name: 'KKS 1925 Kalisz', country: 'PL', league: 3, attack: 63, defense: 63 },
  { id: 44, name: 'Hutnik Kraków', country: 'PL', league: 3, attack: 61, defense: 59 },
  { id: 45, name: 'Chojniczanka Chojnice', country: 'PL', league: 3, attack: 62, defense: 62 },
  { id: 46, name: 'Wisła Puławy', country: 'PL', league: 3, attack: 61, defense: 60 },
  { id: 47, name: 'Olimpia Grudziądz', country: 'PL', league: 3, attack: 60, defense: 61 },
  { id: 48, name: 'Świt Szczecin', country: 'PL', league: 3, attack: 61, defense: 60 },
  { id: 49, name: 'GKS Jastrzębie', country: 'PL', league: 3, attack: 59, defense: 60 },
  { id: 50, name: 'Rekord Bielsko-Biała', country: 'PL', league: 3, attack: 60, defense: 58 },
  { id: 51, name: 'Zagłębie II Lubin', country: 'PL', league: 3, attack: 60, defense: 59 },
  { id: 52, name: 'ŁKS II Łódź', country: 'PL', league: 3, attack: 59, defense: 59 },
  { id: 53, name: 'Olimpia Elbląg', country: 'PL', league: 3, attack: 58, defense: 59 },
  { id: 54, name: 'Skra Częstochowa', country: 'PL', league: 3, attack: 57, defense: 58 },
  // --- PREMIER LEAGUE (League: 1) ---
  { id: 55, name: 'Manchester City', country: 'GB-ENG', league: 1, attack: 91, defense: 89 },
  { id: 56, name: 'Arsenal', country: 'GB-ENG', league: 1, attack: 88, defense: 91 },
  { id: 57, name: 'Liverpool', country: 'GB-ENG', league: 1, attack: 90, defense: 88 },
  { id: 58, name: 'Aston Villa', country: 'GB-ENG', league: 1, attack: 84, defense: 82 },
  { id: 59, name: 'Tottenham Hotspur', country: 'GB-ENG', league: 1, attack: 85, defense: 80 },
  { id: 60, name: 'Chelsea', country: 'GB-ENG', league: 1, attack: 86, defense: 81 },
  { id: 61, name: 'Newcastle United', country: 'GB-ENG', league: 1, attack: 83, defense: 80 },
  { id: 62, name: 'Manchester United', country: 'GB-ENG', league: 1, attack: 82, defense: 80 },
  { id: 63, name: 'West Ham United', country: 'GB-ENG', league: 1, attack: 79, defense: 78 },
  { id: 64, name: 'Brighton & Hove Albion', country: 'GB-ENG', league: 1, attack: 78, defense: 77 },
  { id: 65, name: 'Bournemouth', country: 'GB-ENG', league: 1, attack: 77, defense: 76 },
  { id: 66, name: 'Crystal Palace', country: 'GB-ENG', league: 1, attack: 78, defense: 76 },
  { id: 67, name: 'Wolverhampton', country: 'GB-ENG', league: 1, attack: 76, defense: 75 },
  { id: 68, name: 'Fulham', country: 'GB-ENG', league: 1, attack: 77, defense: 76 },
  { id: 69, name: 'Everton', country: 'GB-ENG', league: 1, attack: 75, defense: 78 },
  { id: 70, name: 'Brentford', country: 'GB-ENG', league: 1, attack: 76, defense: 74 },
  { id: 71, name: 'Nottingham Forest', country: 'GB-ENG', league: 1, attack: 75, defense: 75 },
  { id: 72, name: 'Leicester City', country: 'GB-ENG', league: 1, attack: 74, defense: 73 },
  { id: 73, name: 'Ipswich Town', country: 'GB-ENG', league: 1, attack: 73, defense: 72 },
  { id: 74, name: 'Southampton', country: 'GB-ENG', league: 1, attack: 72, defense: 71 },

  // --- CHAMPIONSHIP (League: 2) ---
  { id: 75, name: 'Leeds United', country: 'GB-ENG', league: 2, attack: 76, defense: 75 },
  { id: 76, name: 'Burnley', country: 'GB-ENG', league: 2, attack: 75, defense: 74 },
  { id: 77, name: 'Luton Town', country: 'GB-ENG', league: 2, attack: 74, defense: 73 },
  { id: 78, name: 'Sheffield United', country: 'GB-ENG', league: 2, attack: 73, defense: 72 },
  { id: 79, name: 'Middlesbrough', country: 'GB-ENG', league: 2, attack: 74, defense: 72 },
  { id: 80, name: 'Coventry City', country: 'GB-ENG', league: 2, attack: 73, defense: 71 },
  { id: 81, name: 'Norwich City', country: 'GB-ENG', league: 2, attack: 72, defense: 71 },
  { id: 82, name: 'West Bromwich Albion', country: 'GB-ENG', league: 2, attack: 71, defense: 73 },
  { id: 83, name: 'Hull City', country: 'GB-ENG', league: 2, attack: 72, defense: 70 },
  { id: 84, name: 'Sunderland', country: 'GB-ENG', league: 2, attack: 73, defense: 72 },
  { id: 85, name: 'Watford', country: 'GB-ENG', league: 2, attack: 71, defense: 70 },
  { id: 86, name: 'Preston North End', country: 'GB-ENG', league: 2, attack: 70, defense: 71 },
  { id: 87, name: 'Bristol City', country: 'GB-ENG', league: 2, attack: 70, defense: 70 },
  { id: 88, name: 'Cardiff City', country: 'GB-ENG', league: 2, attack: 69, defense: 70 },
  { id: 89, name: 'Millwall', country: 'GB-ENG', league: 2, attack: 68, defense: 71 },
  { id: 90, name: 'Swansea City', country: 'GB-ENG', league: 2, attack: 69, defense: 69 },
  { id: 91, name: 'Stoke City', country: 'GB-ENG', league: 2, attack: 70, defense: 69 },
  { id: 92, name: 'Queens Park Rangers', country: 'GB-ENG', league: 2, attack: 68, defense: 68 },
  { id: 93, name: 'Blackburn Rovers', country: 'GB-ENG', league: 2, attack: 71, defense: 67 },
  { id: 94, name: 'Sheffield Wednesday', country: 'GB-ENG', league: 2, attack: 69, defense: 69 },
  { id: 95, name: 'Plymouth Argyle', country: 'GB-ENG', league: 2, attack: 68, defense: 67 },
  { id: 96, name: 'Portsmouth', country: 'GB-ENG', league: 2, attack: 68, defense: 68 },
  { id: 97, name: 'Derby County', country: 'GB-ENG', league: 2, attack: 67, defense: 68 },
  { id: 98, name: 'Oxford United', country: 'GB-ENG', league: 2, attack: 66, defense: 67 },

  // --- LEAGUE ONE (League: 3) ---
  { id: 99, name: 'Birmingham City', country: 'GB-ENG', league: 3, attack: 72, defense: 70 },
  { id: 100, name: 'Huddersfield Town', country: 'GB-ENG', league: 3, attack: 69, defense: 68 },
  { id: 101, name: 'Bolton Wanderers', country: 'GB-ENG', league: 3, attack: 68, defense: 67 },
  { id: 102, name: 'Rotherham United', country: 'GB-ENG', league: 3, attack: 67, defense: 68 },
  { id: 103, name: 'Peterborough United', country: 'GB-ENG', league: 3, attack: 69, defense: 64 },
  { id: 104, name: 'Wrexham', country: 'GB-ENG', league: 3, attack: 67, defense: 66 },
  { id: 105, name: 'Barnsley', country: 'GB-ENG', league: 3, attack: 66, defense: 65 },
  { id: 106, name: 'Charlton Athletic', country: 'GB-ENG', league: 3, attack: 66, defense: 66 },
  { id: 107, name: 'Wycombe Wanderers', country: 'GB-ENG', league: 3, attack: 65, defense: 66 },
  { id: 108, name: 'Lincoln City', country: 'GB-ENG', league: 3, attack: 64, defense: 67 },
  { id: 109, name: 'Blackpool', country: 'GB-ENG', league: 3, attack: 66, defense: 65 },
  { id: 110, name: 'Wigan Athletic', country: 'GB-ENG', league: 3, attack: 65, defense: 65 },
  { id: 111, name: 'Reading', country: 'GB-ENG', league: 3, attack: 66, defense: 64 },
  { id: 112, name: 'Stockport County', country: 'GB-ENG', league: 3, attack: 65, defense: 64 },
  { id: 113, name: 'Leyton Orient', country: 'GB-ENG', league: 3, attack: 64, defense: 64 },
  { id: 114, name: 'Stevenage', country: 'GB-ENG', league: 3, attack: 62, defense: 65 },
  { id: 115, name: 'Northampton Town', country: 'GB-ENG', league: 3, attack: 62, defense: 63 },
  { id: 116, name: 'Exeter City', country: 'GB-ENG', league: 3, attack: 63, defense: 62 },
  { id: 117, name: 'Bristol Rovers', country: 'GB-ENG', league: 3, attack: 64, defense: 61 },
  { id: 118, name: 'Mansfield Town', country: 'GB-ENG', league: 3, attack: 63, defense: 62 },
  { id: 119, name: 'Cambridge United', country: 'GB-ENG', league: 3, attack: 61, defense: 61 },
  { id: 120, name: 'Burton Albion', country: 'GB-ENG', league: 3, attack: 60, defense: 61 },
  { id: 121, name: 'Shrewsbury Town', country: 'GB-ENG', league: 3, attack: 59, defense: 60 },
  { id: 122, name: 'Crawley Town', country: 'GB-ENG', league: 3, attack: 60, defense: 59 },
  // --- LIGUE 1 (League: 1) ---
  { id: 123, name: 'Paris Saint-Germain', country: 'FR', league: 1, attack: 89, defense: 86 },
  { id: 124, name: 'AS Monaco', country: 'FR', league: 1, attack: 82, defense: 80 },
  { id: 125, name: 'Lille OSC', country: 'FR', league: 1, attack: 80, defense: 81 },
  { id: 126, name: 'Stade Brestois', country: 'FR', league: 1, attack: 79, defense: 78 },
  { id: 127, name: 'OGC Nice', country: 'FR', league: 1, attack: 77, defense: 81 },
  { id: 128, name: 'Olympique Lyon', country: 'FR', league: 1, attack: 79, defense: 76 },
  { id: 129, name: 'RC Lens', country: 'FR', league: 1, attack: 78, defense: 79 },
  { id: 130, name: 'Olympique Marseille', country: 'FR', league: 1, attack: 81, defense: 77 },
  { id: 131, name: 'Stade de Reims', country: 'FR', league: 1, attack: 76, defense: 75 },
  { id: 132, name: 'Stade Rennais', country: 'FR', league: 1, attack: 78, defense: 76 },
  { id: 133, name: 'Toulouse FC', country: 'FR', league: 1, attack: 75, defense: 74 },
  { id: 134, name: 'Montpellier HSC', country: 'FR', league: 1, attack: 76, defense: 73 },
  { id: 135, name: 'RC Strasbourg', country: 'FR', league: 1, attack: 74, defense: 74 },
  { id: 136, name: 'FC Nantes', country: 'FR', league: 1, attack: 73, defense: 75 },
  { id: 137, name: 'Le Havre', country: 'FR', league: 1, attack: 72, defense: 73 },
  { id: 138, name: 'AJ Auxerre', country: 'FR', league: 1, attack: 73, defense: 72 },
  { id: 139, name: 'Angers SCO', country: 'FR', league: 1, attack: 71, defense: 72 },
  { id: 140, name: 'Saint-Étienne', country: 'FR', league: 1, attack: 74, defense: 73 },

  // --- LIGUE 2 (League: 2) ---
  { id: 141, name: 'FC Metz', country: 'FR', league: 2, attack: 73, defense: 72 },
  { id: 142, name: 'FC Lorient', country: 'FR', league: 2, attack: 74, defense: 71 },
  { id: 143, name: 'Clermont Foot', country: 'FR', league: 2, attack: 71, defense: 72 },
  { id: 144, name: 'Paris FC', country: 'FR', league: 2, attack: 72, defense: 71 },
  { id: 145, name: 'SM Caen', country: 'FR', league: 2, attack: 70, defense: 69 },
  { id: 146, name: 'EA Guingamp', country: 'FR', league: 2, attack: 69, defense: 70 },
  { id: 147, name: 'Rodez AF', country: 'FR', league: 2, attack: 71, defense: 67 },
  { id: 148, name: 'Stade Lavallois', country: 'FR', league: 2, attack: 68, defense: 69 },
  { id: 149, name: 'Pau FC', country: 'FR', league: 2, attack: 69, defense: 68 },
  { id: 150, name: 'Amiens SC', country: 'FR', league: 2, attack: 67, defense: 70 },
  { id: 151, name: 'Grenoble Foot 38', country: 'FR', league: 2, attack: 68, defense: 68 },
  { id: 152, name: 'SC Bastia', country: 'FR', league: 2, attack: 67, defense: 69 },
  { id: 153, name: 'FC Annecy', country: 'FR', league: 2, attack: 68, defense: 67 },
  { id: 154, name: 'AC Ajaccio', country: 'FR', league: 2, attack: 65, defense: 68 },
  { id: 155, name: 'US Dunkerque', country: 'FR', league: 2, attack: 66, defense: 66 },
  { id: 156, name: 'ESTAC Troyes', country: 'FR', league: 2, attack: 67, defense: 65 },
  { id: 157, name: 'Red Star FC', country: 'FR', league: 2, attack: 66, defense: 64 },
  { id: 158, name: 'FC Martigues', country: 'FR', league: 2, attack: 64, defense: 63 },

  // --- NATIONAL (League: 3) ---
  { id: 159, name: 'FC Sochaux', country: 'FR', league: 3, attack: 68, defense: 67 },
  { id: 160, name: 'Dijon FCO', country: 'FR', league: 3, attack: 67, defense: 66 },
  { id: 161, name: 'AS Nancy', country: 'FR', league: 3, attack: 66, defense: 65 },
  { id: 162, name: 'Valenciennes FC', country: 'FR', league: 3, attack: 65, defense: 66 },
  { id: 163, name: 'US Quevilly-Rouen', country: 'FR', league: 3, attack: 64, defense: 65 },
  { id: 164, name: 'US Concarneau', country: 'FR', league: 3, attack: 63, defense: 64 },
  { id: 165, name: 'Le Mans FC', country: 'FR', league: 3, attack: 64, defense: 63 },
  { id: 166, name: 'US Orléans', country: 'FR', league: 3, attack: 63, defense: 63 },
  { id: 167, name: 'Versailles', country: 'FR', league: 3, attack: 65, defense: 62 },
  { id: 168, name: 'Nîmes Olympique', country: 'FR', league: 3, attack: 62, defense: 62 },
  { id: 169, name: 'LB Châteauroux', country: 'FR', league: 3, attack: 61, defense: 61 },
  { id: 170, name: 'FC Rouen', country: 'FR', league: 3, attack: 62, defense: 60 },
  { id: 171, name: 'US Boulogne', country: 'FR', league: 3, attack: 60, defense: 60 },
  { id: 172, name: 'Bourg-Péronnas', country: 'FR', league: 3, attack: 59, defense: 60 },
  { id: 173, name: 'FC Villefranche', country: 'FR', league: 3, attack: 60, defense: 59 },
  { id: 174, name: 'Aubagne FC', country: 'FR', league: 3, attack: 58, defense: 59 },
  { id: 175, name: 'Paris 13 Atletico', country: 'FR', league: 3, attack: 57, defense: 58 },
  // --- LA LIGA (League: 1) ---
  { id: 176, name: 'Real Madryt', country: 'ES', league: 1, attack: 92, defense: 89 },
  { id: 177, name: 'FC Barcelona', country: 'ES', league: 1, attack: 89, defense: 86 },
  { id: 178, name: 'Atlético Madryt', country: 'ES', league: 1, attack: 85, defense: 88 },
  { id: 179, name: 'Girona FC', country: 'ES', league: 1, attack: 82, defense: 78 },
  { id: 180, name: 'Athletic Bilbao', country: 'ES', league: 1, attack: 81, defense: 83 },
  { id: 181, name: 'Real Sociedad', country: 'ES', league: 1, attack: 79, defense: 80 },
  { id: 182, name: 'Real Betis', country: 'ES', league: 1, attack: 78, defense: 77 },
  { id: 183, name: 'Villarreal CF', country: 'ES', league: 1, attack: 79, defense: 76 },
  { id: 184, name: 'Valencia CF', country: 'ES', league: 1, attack: 75, defense: 76 },
  { id: 185, name: 'Sevilla FC', country: 'ES', league: 1, attack: 76, defense: 75 },
  { id: 186, name: 'Osasuna', country: 'ES', league: 1, attack: 74, defense: 75 },
  { id: 187, name: 'Getafe CF', country: 'ES', league: 1, attack: 71, defense: 76 },
  { id: 188, name: 'Celta Vigo', country: 'ES', league: 1, attack: 75, defense: 72 },
  { id: 189, name: 'RCD Mallorca', country: 'ES', league: 1, attack: 72, defense: 75 },
  { id: 190, name: 'Deportivo Alavés', country: 'ES', league: 1, attack: 72, defense: 73 },
  { id: 191, name: 'Las Palmas', country: 'ES', league: 1, attack: 71, defense: 71 },
  { id: 192, name: 'Rayo Vallecano', country: 'ES', league: 1, attack: 72, defense: 70 },
  { id: 193, name: 'CD Leganés', country: 'ES', league: 1, attack: 70, defense: 71 },
  { id: 194, name: 'Real Valladolid', country: 'ES', league: 1, attack: 70, defense: 70 },
  { id: 195, name: 'RCD Espanyol', country: 'ES', league: 1, attack: 71, defense: 70 },

  // --- LA LIGA 2 / SEGUNDA DIVISIÓN (League: 2) ---
  { id: 196, name: 'Cádiz CF', country: 'ES', league: 2, attack: 74, defense: 73 },
  { id: 197, name: 'UD Almería', country: 'ES', league: 2, attack: 75, defense: 71 },
  { id: 198, name: 'Granada CF', country: 'ES', league: 2, attack: 74, defense: 72 },
  { id: 199, name: 'Real Oviedo', country: 'ES', league: 2, attack: 72, defense: 73 },
  { id: 200, name: 'Sporting Gijón', country: 'ES', league: 2, attack: 71, defense: 72 },
  { id: 201, name: 'SD Eibar', country: 'ES', league: 2, attack: 72, defense: 71 },
  { id: 202, name: 'Racing Santander', country: 'ES', league: 2, attack: 73, defense: 70 },
  { id: 203, name: 'Levante UD', country: 'ES', league: 2, attack: 71, defense: 71 },
  { id: 204, name: 'Burgos CF', country: 'ES', league: 2, attack: 69, defense: 72 },
  { id: 205, name: 'Elche CF', country: 'ES', league: 2, attack: 70, defense: 70 },
  { id: 206, name: 'Real Saragossa', country: 'ES', league: 2, attack: 68, defense: 70 },
  { id: 207, name: 'CD Tenerife', country: 'ES', league: 2, attack: 67, defense: 71 },
  { id: 208, name: 'Albacete', country: 'ES', league: 2, attack: 69, defense: 68 },
  { id: 209, name: 'Racing Ferrol', country: 'ES', league: 2, attack: 68, defense: 69 },
  { id: 210, name: 'FC Cartagena', country: 'ES', league: 2, attack: 67, defense: 68 },
  { id: 211, name: 'CD Eldense', country: 'ES', league: 2, attack: 66, defense: 67 },
  { id: 212, name: 'SD Huesca', country: 'ES', league: 2, attack: 65, defense: 69 },
  { id: 213, name: 'CD Mirandés', country: 'ES', league: 2, attack: 66, defense: 66 },
  { id: 214, name: 'Deportivo La Coruña', country: 'ES', league: 2, attack: 73, defense: 70 },
  { id: 215, name: 'Málaga CF', country: 'ES', league: 2, attack: 71, defense: 70 },
  { id: 216, name: 'CD Castellón', country: 'ES', league: 2, attack: 70, defense: 68 },
  { id: 217, name: 'Córdoba CF', country: 'ES', league: 2, attack: 69, defense: 68 },

  // --- PRIMERA FEDERACIÓN (League: 3) ---
  { id: 218, name: 'FC Andorra', country: 'ES', league: 3, attack: 67, defense: 66 },
  { id: 219, name: 'AD Alcorcón', country: 'ES', league: 3, attack: 66, defense: 65 },
  { id: 220, name: 'SD Amorebieta', country: 'ES', league: 3, attack: 65, defense: 64 },
  { id: 221, name: 'Villarreal B', country: 'ES', league: 3, attack: 66, defense: 63 },
  { id: 222, name: 'Barça Atlètic', country: 'ES', league: 3, attack: 68, defense: 62 },
  { id: 223, name: 'Gimnàstic Tarragona', country: 'ES', league: 3, attack: 65, defense: 66 },
  { id: 224, name: 'UD Ibiza', country: 'ES', league: 3, attack: 66, defense: 64 },
  { id: 225, name: 'SD Ponferradina', country: 'ES', league: 3, attack: 65, defense: 65 },
  { id: 226, name: 'Cultural Leonesa', country: 'ES', league: 3, attack: 64, defense: 64 },
  { id: 227, name: 'Recreativo Huelva', country: 'ES', league: 3, attack: 63, defense: 63 },
  { id: 228, name: 'Real Murcia', country: 'ES', league: 3, attack: 64, defense: 63 },
  { id: 229, name: 'Unionistas de Salamanca', country: 'ES', league: 3, attack: 62, defense: 63 },
  { id: 230, name: 'AD Ceuta', country: 'ES', league: 3, attack: 63, defense: 62 },
  { id: 231, name: 'Celta Fortuna', country: 'ES', league: 3, attack: 64, defense: 61 },
  { id: 232, name: 'Real Sociedad B', country: 'ES', league: 3, attack: 63, defense: 62 },
  { id: 233, name: 'Hércules CF', country: 'ES', league: 3, attack: 64, defense: 62 },
  { id: 234, name: 'Antequera CF', country: 'ES', league: 3, attack: 61, defense: 61 },
  { id: 235, name: 'Atlético Madryt B', country: 'ES', league: 3, attack: 62, defense: 61 },
  { id: 236, name: 'CD Lugo', country: 'ES', league: 3, attack: 61, defense: 62 },
  { id: 237, name: 'Sestao River', country: 'ES', league: 3, attack: 59, defense: 60 },
  // --- SERIE A (League: 1) ---
  { id: 238, name: 'Inter Mediolan', country: 'IT', league: 1, attack: 90, defense: 89 },
  { id: 239, name: 'AC Milan', country: 'IT', league: 1, attack: 86, defense: 84 },
  { id: 240, name: 'Juventus', country: 'IT', league: 1, attack: 84, defense: 87 },
  { id: 241, name: 'Atalanta', country: 'IT', league: 1, attack: 87, defense: 82 },
  { id: 242, name: 'Napoli', country: 'IT', league: 1, attack: 85, defense: 83 },
  { id: 243, name: 'AS Roma', country: 'IT', league: 1, attack: 82, defense: 80 },
  { id: 244, name: 'Lazio', country: 'IT', league: 1, attack: 80, defense: 79 },
  { id: 245, name: 'Bologna', country: 'IT', league: 1, attack: 78, defense: 78 },
  { id: 246, name: 'Fiorentina', country: 'IT', league: 1, attack: 79, defense: 77 },
  { id: 247, name: 'Torino', country: 'IT', league: 1, attack: 75, defense: 78 },
  { id: 248, name: 'Genoa', country: 'IT', league: 1, attack: 76, defense: 75 },
  { id: 249, name: 'Monza', country: 'IT', league: 1, attack: 74, defense: 74 },
  { id: 250, name: 'Udinese', country: 'IT', league: 1, attack: 75, defense: 73 },
  { id: 251, name: 'Lecce', country: 'IT', league: 1, attack: 72, defense: 74 },
  { id: 252, name: 'Hellas Verona', country: 'IT', league: 1, attack: 73, defense: 72 },
  { id: 253, name: 'Cagliari', country: 'IT', league: 1, attack: 73, defense: 71 },
  { id: 254, name: 'Empoli', country: 'IT', league: 1, attack: 71, defense: 72 },
  { id: 255, name: 'Parma', country: 'IT', league: 1, attack: 74, defense: 71 },
  { id: 256, name: 'Como', country: 'IT', league: 1, attack: 75, defense: 72 },
  { id: 257, name: 'Venezia', country: 'IT', league: 1, attack: 70, defense: 71 },

  // --- SERIE B (League: 2) ---
  { id: 258, name: 'Sassuolo', country: 'IT', league: 2, attack: 76, defense: 74 },
  { id: 259, name: 'Frosinone', country: 'IT', league: 2, attack: 73, defense: 72 },
  { id: 260, name: 'Salernitana', country: 'IT', league: 2, attack: 72, defense: 71 },
  { id: 261, name: 'Palermo', country: 'IT', league: 2, attack: 74, defense: 72 },
  { id: 262, name: 'Sampdoria', country: 'IT', league: 2, attack: 73, defense: 73 },
  { id: 263, name: 'Cremonese', country: 'IT', league: 2, attack: 74, defense: 71 },
  { id: 264, name: 'Pisa', country: 'IT', league: 2, attack: 71, defense: 72 },
  { id: 265, name: 'Brescia', country: 'IT', league: 2, attack: 70, defense: 71 },
  { id: 266, name: 'Spezia', country: 'IT', league: 2, attack: 69, defense: 70 },
  { id: 267, name: 'Bari', country: 'IT', league: 2, attack: 70, defense: 70 },
  { id: 268, name: 'Catanzaro', country: 'IT', league: 2, attack: 71, defense: 68 },
  { id: 269, name: 'Modena', country: 'IT', league: 2, attack: 68, defense: 69 },
  { id: 270, name: 'Reggiana', country: 'IT', league: 2, attack: 67, defense: 68 },
  { id: 271, name: 'Sudtirol', country: 'IT', league: 2, attack: 66, defense: 70 },
  { id: 272, name: 'Cittadella', country: 'IT', league: 2, attack: 67, defense: 67 },
  { id: 273, name: 'Cosenza', country: 'IT', league: 2, attack: 66, defense: 66 },
  { id: 274, name: 'Cesena', country: 'IT', league: 2, attack: 68, defense: 67 },
  { id: 275, name: 'Mantova', country: 'IT', league: 2, attack: 67, defense: 65 },
  { id: 276, name: 'Juve Stabia', country: 'IT', league: 2, attack: 65, defense: 66 },
  { id: 277, name: 'Carrarese', country: 'IT', league: 2, attack: 64, defense: 65 },

  // --- SERIE C (League: 3) ---
  { id: 278, name: 'Catania', country: 'IT', league: 3, attack: 68, defense: 66 },
  { id: 279, name: 'Vicenza', country: 'IT', league: 3, attack: 67, defense: 67 },
  { id: 280, name: 'Padova', country: 'IT', league: 3, attack: 67, defense: 66 },
  { id: 281, name: 'Avellino', country: 'IT', league: 3, attack: 66, defense: 65 },
  { id: 282, name: 'Benevento', country: 'IT', league: 3, attack: 66, defense: 64 },
  { id: 283, name: 'SPAL', country: 'IT', league: 3, attack: 65, defense: 64 },
  { id: 284, name: 'Perugia', country: 'IT', league: 3, attack: 65, defense: 65 },
  { id: 285, name: 'Ascoli', country: 'IT', league: 3, attack: 64, defense: 65 },
  { id: 286, name: 'Ternana', country: 'IT', league: 3, attack: 64, defense: 64 },
  { id: 287, name: 'Pescara', country: 'IT', league: 3, attack: 63, defense: 63 },
  { id: 288, name: 'Foggia', country: 'IT', league: 3, attack: 62, defense: 62 },
  { id: 289, name: 'Crotone', country: 'IT', league: 3, attack: 63, defense: 61 },
  { id: 290, name: 'Triestina', country: 'IT', league: 3, attack: 62, defense: 63 },
  { id: 291, name: 'Virtus Entella', country: 'IT', league: 3, attack: 61, defense: 62 },
  { id: 292, name: 'Torres', country: 'IT', league: 3, attack: 62, defense: 61 },
  { id: 293, name: 'Trapani', country: 'IT', league: 3, attack: 63, defense: 60 },
  { id: 294, name: 'Arezzo', country: 'IT', league: 3, attack: 60, defense: 60 },
  { id: 295, name: 'Novara', country: 'IT', league: 3, attack: 59, defense: 60 },
  // --- BUNDESLIGA (League: 1) ---
  { id: 296, name: 'Bayer Leverkusen', country: 'DE', league: 1, attack: 89, defense: 88 },
  { id: 297, name: 'Bayern Monachium', country: 'DE', league: 1, attack: 90, defense: 86 },
  { id: 298, name: 'VfB Stuttgart', country: 'DE', league: 1, attack: 84, defense: 82 },
  { id: 299, name: 'RB Lipsk', country: 'DE', league: 1, attack: 83, defense: 83 },
  { id: 300, name: 'Borussia Dortmund', country: 'DE', league: 1, attack: 85, defense: 81 },
  { id: 301, name: 'Eintracht Frankfurt', country: 'DE', league: 1, attack: 79, defense: 78 },
  { id: 302, name: 'TSG Hoffenheim', country: 'DE', league: 1, attack: 78, defense: 75 },
  { id: 303, name: '1. FC Heidenheim', country: 'DE', league: 1, attack: 74, defense: 76 },
  { id: 304, name: 'Werder Brema', country: 'DE', league: 1, attack: 75, defense: 75 },
  { id: 305, name: 'SC Freiburg', country: 'DE', league: 1, attack: 76, defense: 77 },
  { id: 306, name: 'FC Augsburg', country: 'DE', league: 1, attack: 73, defense: 74 },
  { id: 307, name: 'VfL Wolfsburg', country: 'DE', league: 1, attack: 75, defense: 76 },
  { id: 308, name: 'FSV Mainz 05', country: 'DE', league: 1, attack: 74, defense: 75 },
  { id: 309, name: 'Borussia M\'Gladbach', country: 'DE', league: 1, attack: 76, defense: 74 },
  { id: 310, name: 'Union Berlin', country: 'DE', league: 1, attack: 72, defense: 77 },
  { id: 311, name: 'VfL Bochum', country: 'DE', league: 1, attack: 71, defense: 72 },
  { id: 312, name: 'FC St. Pauli', country: 'DE', league: 1, attack: 72, defense: 71 },
  { id: 313, name: 'Holstein Kiel', country: 'DE', league: 1, attack: 71, defense: 70 },

  // --- 2. BUNDESLIGA (League: 2) ---
  { id: 314, name: '1. FC Köln', country: 'DE', league: 2, attack: 75, defense: 73 },
  { id: 315, name: 'SV Darmstadt 98', country: 'DE', league: 2, attack: 72, defense: 71 },
  { id: 316, name: 'Fortuna Düsseldorf', country: 'DE', league: 2, attack: 74, defense: 72 },
  { id: 317, name: 'Hamburger SV', country: 'DE', league: 2, attack: 75, defense: 71 },
  { id: 318, name: 'Karlsruher SC', country: 'DE', league: 2, attack: 71, defense: 70 },
  { id: 319, name: 'Hannover 96', country: 'DE', league: 2, attack: 70, defense: 71 },
  { id: 320, name: 'SC Paderborn', country: 'DE', league: 2, attack: 71, defense: 69 },
  { id: 321, name: 'Greuther Fürth', country: 'DE', league: 2, attack: 69, defense: 69 },
  { id: 322, name: 'Hertha BSC', country: 'DE', league: 2, attack: 74, defense: 70 },
  { id: 323, name: 'Schalke 04', country: 'DE', league: 2, attack: 73, defense: 68 },
  { id: 324, name: 'SV Elversberg', country: 'DE', league: 2, attack: 68, defense: 67 },
  { id: 325, name: '1. FC Nürnberg', country: 'DE', league: 2, attack: 69, defense: 68 },
  { id: 326, name: '1. FC Kaiserslautern', country: 'DE', league: 2, attack: 70, defense: 67 },
  { id: 327, name: '1. FC Magdeburg', country: 'DE', league: 2, attack: 68, defense: 68 },
  { id: 328, name: 'Eintracht Brunszwik', country: 'DE', league: 2, attack: 66, defense: 67 },
  { id: 329, name: 'SSV Ulm', country: 'DE', league: 2, attack: 67, defense: 66 },
  { id: 330, name: 'Preußen Münster', country: 'DE', league: 2, attack: 66, defense: 65 },
  { id: 331, name: 'Jahn Regensburg', country: 'DE', league: 2, attack: 65, defense: 66 },

  // --- 3. LIGA (League: 3) ---
  { id: 332, name: 'Hansa Rostock', country: 'DE', league: 3, attack: 67, defense: 66 },
  { id: 333, name: 'VfL Osnabrück', country: 'DE', league: 3, attack: 66, defense: 65 },
  { id: 334, name: 'Wehen Wiesbaden', country: 'DE', league: 3, attack: 66, defense: 66 },
  { id: 335, name: 'Dynamo Drezno', country: 'DE', league: 3, attack: 68, defense: 65 },
  { id: 336, name: '1. FC Saarbrücken', country: 'DE', league: 3, attack: 65, defense: 66 },
  { id: 337, name: 'Erzgebirge Aue', country: 'DE', league: 3, attack: 64, defense: 64 },
  { id: 338, name: 'Rot-Weiss Essen', country: 'DE', league: 3, attack: 65, defense: 63 },
  { id: 339, name: 'SV Sandhausen', country: 'DE', league: 3, attack: 65, defense: 65 },
  { id: 340, name: 'SpVgg Unterhaching', country: 'DE', league: 3, attack: 63, defense: 63 },
  { id: 341, name: 'FC Ingolstadt', country: 'DE', league: 3, attack: 65, defense: 64 },
  { id: 342, name: 'Borussia Dortmund II', country: 'DE', league: 3, attack: 64, defense: 62 },
  { id: 343, name: 'SC Verl', country: 'DE', league: 3, attack: 62, defense: 61 },
  { id: 344, name: 'Viktoria Köln', country: 'DE', league: 3, attack: 63, defense: 62 },
  { id: 345, name: 'Arminia Bielefeld', country: 'DE', league: 3, attack: 66, defense: 64 },
  { id: 346, name: '1860 Monachium', country: 'DE', league: 3, attack: 64, defense: 63 },
  { id: 347, name: 'Waldhof Mannheim', country: 'DE', league: 3, attack: 63, defense: 62 },
  { id: 348, name: 'Alemannia Aachen', country: 'DE', league: 3, attack: 64, defense: 63 },
  { id: 349, name: 'Energie Cottbus', country: 'DE', league: 3, attack: 63, defense: 62 },
  { id: 350, name: 'Hannover 96 II', country: 'DE', league: 3, attack: 60, defense: 61 },
  { id: 351, name: 'VfB Stuttgart II', country: 'DE', league: 3, attack: 61, defense: 60 }
];

export const calculatePlayerValue = (skill, potential, age) => {
    let baseValue = 0;

    // 1. Baza wartości zależna od OVR (System progowy)
    // Słabi gracze są tani, gwiazdy są bardzo drogie.
    if (skill < 60) {
        baseValue = skill * 500; // Np. 50 OVR = 25k (bardzo tanio)
    } else if (skill < 70) {
        // OVR 60-69: od 50k do ~500k
        baseValue = 50000 + (skill - 60) * 50000; 
    } else if (skill < 76) {
        // OVR 70-75: od 1mln do 3.5mln
        baseValue = 1000000 + (skill - 70) * 500000;
    } else if (skill < 82) {
        // OVR 76-81: od 5mln do 20mln
        baseValue = 5000000 + (skill - 76) * 3000000;
    } else {
        // OVR 82+: 25mln i ostro w górę za każdy punkt
        baseValue = 25000000 + (skill - 82) * 10000000;
    }

    // 2. Mnożnik wieku (Zmieniony: mniejszy bonus za młodość)
    let ageMultiplier = 1.0;
    if (age < 20) ageMultiplier = 1.3;      // Było 3.0 -> Teraz 1.3 (30% droższy)
    else if (age < 24) ageMultiplier = 1.15; // 15% droższy
    else if (age > 31) ageMultiplier = 0.8;  // Starsi tańsi
    else if (age > 34) ageMultiplier = 0.5;  // Emeryci za pół darmo

    // 3. Mnożnik potencjału (Tylko jeśli talent jest dużo wyższy niż skill)
    let potMultiplier = 1.0;
    const diff = potential - skill;
    
    if (diff >= 10) potMultiplier = 1.5; // Duży talent (np. skill 60, pot 75)
    else if (diff >= 5) potMultiplier = 1.2; // Rozwojowy

    // Obliczenie końcowe
    return Math.floor(baseValue * ageMultiplier * potMultiplier);
};

const pickNationality = (teamCountryCode, forceExact = false) => {
    if (forceExact && teamCountryCode) return teamCountryCode;
    if (teamCountryCode && Math.random() < 0.60) return teamCountryCode;
    const keys = Object.keys(NAME_DB);
    return keys[Math.floor(Math.random() * keys.length)];
};

const createPlayer = (teamId, position, ageMin, ageMax, skillBase, skillVar, isJunior, teamCountry = null, forceNation = false) => {
    const age = Math.floor(Math.random() * (ageMax - ageMin + 1)) + ageMin;
    const skill = Math.max(30, skillBase + Math.floor(Math.random() * skillVar) - (skillVar/2));
    
    let potential;
    if (isJunior) potential = Math.min(99, skill + 20 + Math.floor(Math.random() * 30));
    else {
        potential = Math.min(99, skill + Math.floor(Math.random() * (28 - (age - 18))));
        if (potential < skill) potential = skill;
    }

    const nationCode = pickNationality(teamCountry, forceNation);
    const dataNames = NAME_DB[nationCode] || NAME_DB['GB-ENG'];
    const firstName = dataNames.first[Math.floor(Math.random() * dataNames.first.length)];
    const lastName = dataNames.last[Math.floor(Math.random() * dataNames.last.length)];
    
    const shortName = `${firstName.charAt(0)}. ${lastName}`; 
    const fullName = `${firstName} ${lastName}`; 

    const value = calculatePlayerValue(skill, potential, age);
    
    // PENSJA
    let wage = Math.floor(value * 0.008); 
    if (skill > 80) wage = Math.floor(wage * 1.5);
    if (wage < 5000) wage = 5000;

    return {
        id: Math.random().toString(36).substr(2, 9),
        teamId: teamId,
        name: shortName,
        fullName: fullName,
        position: position,
        age: age,
        skill: Math.floor(skill),
        potential: Math.floor(potential),
        form: 5,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        suspension: 0,
        value: value,
        wage: wage,
        injury: 0, // KONTUZJA (0 = zdrowy)
        isStarter: false,
        nation: { code: nationCode },
        faceUrl: `https://i.pravatar.cc/150?u=${Math.random()}`, 
        birthDate: `${Math.floor(Math.random()*28)+1}.${Math.floor(Math.random()*12)+1}.${2024-age}`,
        stats: {
            pace: Math.min(99, skill + Math.floor(Math.random()*20)-10),
            shooting: position === 'NAP' ? Math.min(99, skill + 5) : Math.min(99, skill - 10),
            passing: position === 'POM' ? Math.min(99, skill + 5) : Math.min(99, skill - 5),
            dribbling: Math.min(99, skill + Math.floor(Math.random()*10)-5),
            defense: position === 'OBR' ? Math.min(99, skill + 5) : Math.min(99, skill - 15),
            physical: Math.min(99, skill + Math.floor(Math.random()*15)-7),
        }
    };
};

export const generateSquad = (teamId, teamData) => {
    const players = [];
    const avg = Math.floor((teamData.attack + teamData.defense) / 2);
    const nat = teamData.country;

    players.push({...createPlayer(teamId, 'BR', 20, 34, avg, 10, false, nat), isStarter: true});
    for(let i=0; i<4; i++) players.push({...createPlayer(teamId, 'OBR', 19, 32, avg, 10, false, nat), isStarter: true});
    for(let i=0; i<3; i++) players.push({...createPlayer(teamId, 'POM', 19, 32, avg, 10, false, nat), isStarter: true});
    for(let i=0; i<3; i++) players.push({...createPlayer(teamId, 'NAP', 19, 32, avg, 10, false, nat), isStarter: true});

    const positions = ['BR', 'OBR', 'OBR', 'POM', 'POM', 'NAP', 'NAP'];
    positions.forEach(pos => {
        players.push({...createPlayer(teamId, pos, 17, 30, avg - 8, 12, false, nat), isStarter: false});
    });

    return players;
};

export const generateJunior = (regionId) => {
    const pos = ['BR', 'OBR', 'POM', 'NAP'][Math.floor(Math.random()*4)];
    let choseNation = regionId;
    if (Array.isArray(regionId)){
      choseNation = regionId[Math.floor(Math.random() * regionId.length)];
    }
    return createPlayer(null, pos, 13, 17, 40, 10, true, choseNation, true);
};