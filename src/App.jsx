import React, { useState, useEffect, useRef } from 'react';
import { TEAMS_DATA, SCOUTING_REGIONS, generateSquad, generateJunior, calculatePlayerValue } from './data.js';

// --- STREFA AUDIO (SPOKOJNIEJSZA) ---
// Nowa, spokojniejsza melodia do menu (Piano/Ballada)
const MENU_MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3"; 

// Muzyka meczowa (Trochę szybsza, żeby czuć emocje, ale nie za głośna)
const MATCH_MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

// Tygodnie rozgrywania Ligi Mistrzów (Czysta drabinka dla 32 drużyn)
const CL_WEEKS = {
    RO32: 5,   // 1/16 Finału (NOWE)
    RO16: 9,   // 1/8 Finału
    QF: 15,    // Ćwierćfinał
    SF: 22,    // Półfinał
    FINAL: 32  // Finał
};

// --- HELPERS UI ---
const FlagIcon = ({ code, size = "md" }) => {
  if (!code) return <span className="text-xs opacity-50">🏳️</span>;
  const h = size === "xl" ? "h-8" : size === "sm" ? "h-3" : "h-3.5";
  const w = size === "xl" ? "w-12" : size === "sm" ? "w-4" : "w-5";
  return <img src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} alt={code} className={`inline-block object-cover rounded shadow-sm align-middle ${h} ${w}`} onError={(e) => e.target.style.display = 'none'} />;
};

const formatMoney = (val) => {
    if (!val && val !== 0) return '0 €';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + ' MLN €';
    if (val >= 1000) return (val / 1000).toFixed(0) + ' K €';
    return val + ' €';
};
// --- OBLICZANIE BUDŻETU NA START ---
const calculateDynamicBudget = (team) => {
    // Średnia siła zespołu
    const ovr = Math.round((team.attack + team.defense) / 2);
    let baseBudget = 0;

    // Baza zależna od ligi
    if (team.league === 1) {
        // Liga 1: Baza 5 mln + premia za siłę (duże różnice między gigantami a słabeuszami)
        // Np. OVR 80 -> 5mln + (20 * 1mln) = 25 mln
        // Np. OVR 65 -> 5mln + (5 * 1mln) = 10 mln
        baseBudget = 5000000 + (Math.max(0, ovr - 60) * 800000); 
    } else if (team.league === 2) {
        // Liga 2: Baza 1 mln + mniejsza premia
        baseBudget = 1000000 + (Math.max(0, ovr - 55) * 150000);
    } else {
        // Liga 3: Baza 200 tys. + mała premia
        baseBudget = 200000 + (Math.max(0, ovr - 50) * 50000);
    }

    // Dodajemy lekką losowość +/- 10%
    const variance = (Math.random() * 0.2) + 0.9; 
    return Math.floor(baseBudget * variance);
};

// --- SILNIK MECZOWY ---
const generateLeagueSchedule = (teams) => {
  const n = teams.length;
  if (n === 0) return [];
  const rounds = [];
  const matchesPerRound = n / 2;
  let teamIds = teams.map(t => t.id);
  if (n % 2 !== 0) teamIds.push(null);
  for (let round = 0; round < n - 1; round++) {
    const currentRound = [];
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teamIds[match];
      const away = teamIds[n - 1 - match];
      if (home !== null && away !== null) {
        if (match === 0 || round % 2 === 0) currentRound.push({ home, away });
        else currentRound.push({ away: home, home: away });
      }
    }
    rounds.push(currentRound);
    teamIds.splice(1, 0, teamIds.pop());
  }
  const rematches = rounds.map(round => round.map(match => ({ home: match.away, away: match.home })));
  return [...rounds, ...rematches];
};

// --- DOSTĘPNE FORMACJE TAKTYCZNE ---
const FORMATIONS = {
    '4-4-2': { BR: 1, OBR: 4, POM: 4, NAP: 2 },
    '4-3-3': { BR: 1, OBR: 4, POM: 3, NAP: 3 },
    '3-5-2': { BR: 1, OBR: 3, POM: 5, NAP: 2 },
    '4-2-3-1': { BR: 1, OBR: 4, POM: 5, NAP: 1 },
    '5-3-2': { BR: 1, OBR: 5, POM: 3, NAP: 2 },
    '5-2-3': {BR:1, OBR:5, POM: 2, NAP:3},
    '4-2-4': {BR:1, OBR:4, POM: 2, NAP:4}
};




// --- SILNIK MECZOWY Z BONUSAMI RPG ---
// --- INTELIGENTNY SILNIK MECZOWY Z OSIĄ CZASU I KARTKAMI ---
const simulateMatch = (teamA, teamB, currentPlayers, myTeamId = null, myFormation = null, managerData = null) => {
    const allP = typeof currentPlayers !== 'undefined' ? currentPlayers : [];
    const isMyMatch = myTeamId && (String(teamA.id) === String(myTeamId) || String(teamB.id) === String(myTeamId));

    // KADRY I REZERWY
    let activeA = allP.filter(p => String(p.teamId) === String(teamA.id) && p.isStarter);
    let activeB = allP.filter(p => String(p.teamId) === String(teamB.id) && p.isStarter);
    let benchA = allP.filter(p => String(p.teamId) === String(teamA.id) && !p.isStarter);
    let benchB = allP.filter(p => String(p.teamId) === String(teamB.id) && !p.isStarter);

    const getTeamStrength = (team, squad, formationKey, isMyTeam) => {
        if (squad.length === 0) return { att: team.attack || 50, def: team.defense || 50 };
        const atts = squad.filter(p => p.position === 'NAP' || p.position === 'POM');
        const defs = squad.filter(p => p.position === 'OBR' || p.position === 'BR');
        
        let attOVR = atts.length > 0 ? atts.reduce((s, p) => {
            let effSkill = p.skill;
            if (p.morale !== undefined && p.morale < 50) effSkill -= Math.floor((50 - p.morale) / 10);
            return s + effSkill;
        }, 0) / atts.length : team.attack || 50;

        let defOVR = defs.length > 0 ? defs.reduce((s, p) => {
            let effSkill = p.skill;
            if (p.morale !== undefined && p.morale < 50) effSkill -= Math.floor((50 - p.morale) / 10);
            return s + effSkill;
        }, 0) / defs.length : team.defense || 50;

        if (formationKey) {
            const req = FORMATIONS[formationKey];
            const counts = { BR: 0, OBR: 0, POM: 0, NAP: 0 };
            squad.forEach(p => { if (counts[p.position] !== undefined) counts[p.position]++; });
            let mismatches = Math.abs(req.BR - counts.BR) + Math.abs(req.OBR - counts.OBR) + Math.abs(req.POM - counts.POM) + Math.abs(req.NAP - counts.NAP);
            const misplaced = mismatches / 2;
            const penalty = misplaced * 5;   
            attOVR -= penalty; defOVR -= penalty;
        }

        if (isMyTeam && managerData?.skills?.tactician > 0) {
            const bonus = managerData.skills.tactician * 2; 
            attOVR += bonus; defOVR += bonus;
        }
        return { att: attOVR, def: defOVR };
    };

    const strA = getTeamStrength(teamA, activeA, teamA.id === myTeamId ? myFormation : null, teamA.id === myTeamId);
    const strB = getTeamStrength(teamB, activeB, teamB.id === myTeamId ? myFormation : null, teamB.id === myTeamId);

    const diffA = strA.att - strB.def; 
    const diffB = strB.att - strA.def; 

    // --- TWORZENIE OSI CZASU (TIMELINE) ---
    let chancesA = Math.max(1, Math.floor(Math.random() * 4) + 3 + Math.floor(diffA > 0 ? diffA / 2.5 : 0));
    let chancesB = Math.max(1, Math.floor(Math.random() * 4) + 3 + Math.floor(diffB > 0 ? diffB / 2.5 : 0));
    if (diffA < -10) chancesA = Math.max(0, chancesA - 2);
    if (diffB < -10) chancesB = Math.max(0, chancesB - 2);

    let foulsA = Math.floor(Math.random() * 8) + 4; 
    let foulsB = Math.floor(Math.random() * 8) + 4;

    let timeline = [];
    
    // Wrzucanie potencjalnych wydarzeń na oś czasu (bez wykonania, tylko czas)
    for(let i=0; i<chancesA; i++) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'chance', team: 'home' });
    for(let i=0; i<chancesB; i++) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'chance', team: 'away' });
    
    let injChanceA = (teamA.id === myTeamId && managerData?.skills?.miracle > 0) ? Math.max(0.04, 0.1 - (managerData.skills.miracle * 0.02)) : 0.1;
    let injChanceB = (teamB.id === myTeamId && managerData?.skills?.miracle > 0) ? Math.max(0.04, 0.1 - (managerData.skills.miracle * 0.02)) : 0.1;
    if (Math.random() < injChanceA) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'injury_check', team: 'home' });
    if (Math.random() < injChanceB) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'injury_check', team: 'away' });
    
    for(let i=0; i<foulsA; i++) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'foul', team: 'home' });
    for(let i=0; i<foulsB; i++) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'foul', team: 'away' });

    timeline.sort((a,b) => a.minute - b.minute);

    // --- SYMULACJA KROK PO KROKU ---
    let scoreA = 0; let scoreB = 0; let events = [];
    let redCardsA = 0; let redCardsB = 0;
    let matchYellows = {}; // Rejestr żółtych kartek
    let penaltiesA = 0; let penaltiesB = 0; // Rejestr karnych

    timeline.forEach(ev => {
        let active = ev.team === 'home' ? activeA : activeB;
        let bench = ev.team === 'home' ? benchA : benchB;
        let diff = ev.team === 'home' ? diffA : diffB;
        
        if (active.length === 0) return; // Nikt nie został na boisku!

        // DRUŻYNA W OSŁABIENIU? - potężny spadek szans!
       // PRZEWAGA LICZEBNA I OSŁABIENIE
        // "advantage" na plusie oznacza, że ta drużyna MA WIĘCEJ GRACZY niż przeciwnik
        let advantage = ev.team === 'home' ? (redCardsB - redCardsA) : (redCardsA - redCardsB);
        let dynamicDiff = diff + (advantage * 20); // +20 OVR do różnicy klas za każdego gracza więcej!

        if (ev.type === 'chance') {
            let baseConversion = 0.25;
            if (dynamicDiff > 0) baseConversion += (dynamicDiff * 0.012); 
            else if (dynamicDiff < 0) baseConversion += (dynamicDiff * 0.008); 
            
            // --- BRUTALNY BOOST ZA GRĘ W PRZEWADZE ---
            if (advantage > 0) baseConversion += 0.25; // Ogromny +25% skok skuteczności! (Miazga)
            if (advantage < 0) baseConversion -= 0.15; // Zamurowanie bramki i wybijanie po autach

            if (baseConversion > 0.85) baseConversion = 0.85; // W przewadze skuteczność może dobić aż do 85%!
            if (baseConversion < 0.02) baseConversion = 0.02; // W osłabieniu prawie brak szans

           if (Math.random() < baseConversion) { 
                const attackers = active.filter(p => p.position === 'NAP' || p.position === 'POM');
                let scorer = attackers.length > 0 ? attackers[Math.floor(Math.random() * attackers.length)] : active[0];
                if (!scorer) scorer = { name: "Błąd obrony (Samobój)" }; // Zabezpieczenie
                const others = active.filter(p => p.id !== scorer?.id);
                let assist = null;
                if (others.length > 0 && Math.random() > 0.4) assist = others[Math.floor(Math.random() * others.length)];
                
                events.push({ minute: ev.minute, type: 'goal', team: ev.team, scorer, assist });
                ev.team === 'home' ? scoreA++ : scoreB++;
            }
        } 
        else if (ev.type === 'injury_check') {
            const idx = Math.floor(Math.random() * active.length);
            const pOut = active[idx];
            const weeks = Math.floor(Math.random() * 4) + 1;
            events.push({ minute: ev.minute, type: 'injury', team: ev.team, player: pOut, weeks });
            active.splice(idx, 1); // ZDEJMUJEMY Z BOISKA!

            if (bench.length > 0) {
                // --- INTELIGENTNA ZMIANA: Szuka kogoś na TEJ SAMEJ pozycji ---
                let subIdx = bench.findIndex(p => p.position === pOut.position);
                
                // Jeśli nie mamy rezerwowego na tę pozycję, gra wpuszcza najlepszego gracza z brzegu (z przymusu)
                if (subIdx === -1) subIdx = 0; 
                
                // Zdejmujemy wybranego rezerwowego z ławki i wpuszczamy na murawę
                const pIn = bench.splice(subIdx, 1)[0]; 
                active.push(pIn);
                
                events.push({ minute: ev.minute, type: 'sub', team: ev.team, playerIn: pIn, playerOut: pOut });
            }
        }
        else if (ev.type === 'foul') {
            // --- REALISTYCZNE RZUTY KARNE ---
            if (Math.random() < 0.05) { // Tylko 5% fauli kończy się "jedenastką" (dużo większy realizm!)
                const penTeam = ev.team === 'home' ? 'away' : 'home'; // Faulują gospodarze = karny dla gości
                const penActive = penTeam === 'home' ? activeA : activeB;
                
                penTeam === 'home' ? penaltiesA++ : penaltiesB++;
                
                // Do karnego podchodzi napastnik
                // Do karnego podchodzi napastnik (Zabezpieczenie przed pustym składem)
                let taker = penActive.filter(p => p.position === 'NAP' || p.position === 'POM')[0] || penActive[0];
                if (!taker) taker = { name: "Błąd obrony (Samobój)" }; // Zabezpieczenie ratunkowe
                
                
                if (Math.random() < 0.75) { // 75% skuteczności z karnego
                    events.push({ minute: ev.minute, type: 'goal', team: penTeam, scorer: taker, isPenalty: true });
                    penTeam === 'home' ? scoreA++ : scoreB++;
                } else {
                    events.push({ minute: ev.minute, type: 'missed_penalty', team: penTeam, taker: taker });
                }
            }

            // --- KARTKOWANIE PO FAULU ---
            if (Math.random() < 0.15) { // Żółta
                const idx = Math.floor(Math.random() * active.length);
                const p = active[idx];
                events.push({ minute: ev.minute, type: 'yellow', player: p, team: ev.team });
                
                if (matchYellows[p.id]) { // Druga żółta!
                    events.push({ minute: ev.minute, type: 'red', player: p, team: ev.team, secondYellow: true });
                    active.splice(idx, 1); // WYLATUJE Z BOISKA!
                    ev.team === 'home' ? redCardsA++ : redCardsB++;
                } else {
                    matchYellows[p.id] = true;
                }
            } else if (Math.random() < 0.02) { // Bezpośrednia czerwona
                const idx = Math.floor(Math.random() * active.length);
                const p = active[idx];
                events.push({ minute: ev.minute, type: 'red', player: p, team: ev.team });
                active.splice(idx, 1); // WYLATUJE Z BOISKA!
                ev.team === 'home' ? redCardsA++ : redCardsB++;
            }
        }
    });

    return { 
        scoreA, scoreB, events, teamA, teamB, 
        savesA: Math.max(0, chancesB - scoreB), savesB: Math.max(0, chancesA - scoreA), 
        chancesA, chancesB, foulsA, foulsB, 
        cornersA: Math.floor(Math.random() * 6) + 1, cornersB: Math.floor(Math.random() * 6) + 1, 
        // Rzuty wolne to faule MINUS te faule, które były w polu karnym (Realizm statystyczny!)
        freeKicksA: Math.max(0, foulsB - penaltiesA), 
        freeKicksB: Math.max(0, foulsA - penaltiesB), 
        penaltiesA: penaltiesA, penaltiesB: penaltiesB
    };
};
// --- OBLICZANIE SIŁY ZESPOŁU (OVR) ---
const calculateTeamOVR = (teamId, allPlayers) => {
    if (!teamId || !allPlayers) return 0;
    const squad = allPlayers.filter(p => String(p.teamId) === String(teamId));
    if (squad.length === 0) return 0;
    const best11 = squad.sort((a,b) => b.skill - a.skill).slice(0, 11);
    const totalSkill = best11.reduce((sum, p) => sum + p.skill, 0);
    return Math.round(totalSkill / best11.length);
};

// --- GŁÓWNA APLIKACJA ---
function App() {
  const [appMode, setAppMode] = useState('MENU'); 
  // NOWE STANY DO OBSŁUGI ZAPISÓW
  const [currentSlot, setCurrentSlot] = useState(1);
  const [myFormation, setMyFormation] = useState('4-4-2');
  const [refreshMenu, setRefreshMenu] = useState(false);
  const [hallOfFame, setHallOfFame] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [schedules, setSchedules] = useState([[], [], []]); 
  const [budget, setBudget] = useState(5000000); 
  const [academy, setAcademy] = useState([]); 
  const [notifications, setNotifications] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [expandedGroup, setExpandedGroup] = useState('Klub');
  const [activeLeagueTab, setActiveLeagueTab] = useState(1);
  const [myTeamId, setMyTeamId] = useState(null);
  const [boardConfidence, setBoardConfidence] = useState(100);
  const [week, setWeek] = useState(1);
  const [lastResults, setLastResults] = useState([]);
  const [cupTeams, setCupTeams] = useState([]);
  const [cupHistory, setCupHistory] = useState([]);
  const [seasonHistory, setSeasonHistory] = useState([]);
  const [seasonNum, setSeasonNum] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState(null); 
  const [simulationTime, setSimulationTime] = useState(0); 
  const [pendingUpdates, setPendingUpdates] = useState(null); 
  const [activeSponsor, setActiveSponsor] = useState(null);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transferList, setTransferList] = useState([]); 
  const [activeEvent, setActiveEvent] = useState(null);
  const [infrastructure, setInfrastructure] = useState({ stadium: 1, training: 1, medical: 1 });
  // Stan Ligi Mistrzów
const [clState, setClState] = useState({ active: false, phase: '', teams: [], waiting: [], matches: [], history: [] });
const [userCountryCode,setUserCountryCode]= useState(null);
const [managerData, setManagerData] = useState({ level: 1, xp: 0, sp: 0, skills: { negotiator: 0, tactician: 0, miracle: 0 } });
  const [selectedPlayerForDetails, setSelectedPlayerForDetails] = useState(null); 
  const [swapSourceId, setSwapSourceId] = useState(null); 
  
  const menuAudioRef = useRef(new Audio(MENU_MUSIC_URL));
  const matchAudioRef = useRef(new Audio(MATCH_MUSIC_URL));
  const CUP_WEEKS = [3, 8, 13, 18, 23, 28]; 

 // --- SYSTEM ZAPISU I WCZYTYWANIA GRY (3 SLOTY) ---
  const getSaveInfo = (slotIndex) => {
      const saved = localStorage.getItem(`pm_save_${slotIndex}`);
      if (saved) {
          try {
              const data = JSON.parse(saved);
              const myTeam = data.teams ? data.teams.find(t => String(t.id) === String(data.myTeamId)) : null;
              return {
                  exists: true,
                  teamName: myTeam ? myTeam.name : 'Nieznany Klub',
                  season: data.seasonNum || 1,
                  budget: data.budget || 0
              };
          } catch (e) {
              return { exists: false };
          }
      }
      return { exists: false };
  };

 // --- KULOODPORNY ZAPIS GRY ---
  // --- SUPER KOMPRESOR ZAPISU (DLA 3 SLOTÓW) ---
  // --- SUPER KOMPRESOR ZAPISU 2.0 (Z OCALONYM RAPORTEM) ---
  const saveGame = () => {
      try {
          // 1. Zostawiamy 'events' TYLKO dla najnowszego meczu na pulpicie!
          // Z reszty starszych meczów je wycinamy, żeby plik zapisu ważył ułamek tego co wcześniej.
          const slimLastResults = lastResults.slice(0, 10).map((r, idx) => {
              if (idx === 0) return r; // Najnowszy mecz zostaje nienaruszony (z raportem!)
              return { ...r, events: [] }; 
          });

          // 2. Czyścimy zbędne, gigantyczne dane z historii Ligi Mistrzów
          const slimClState = clState ? {
              ...clState,
              matches: (clState.matches || []).map(m => ({ ...m, events: [], teamA: null, teamB: null })),
              history: (clState.history || []).map(h => ({
                  ...h,
                  matches: (h.matches || []).map(m => ({ ...m, events: [], teamA: null, teamB: null }))
              }))
          } : null;

          const saveData = {
              teams, players, academy, schedules, currentView, week, seasonNum,
              budget, cupTeams, cupHistory, clState: slimClState, seasonHistory, myTeamId,
              transferList, myFormation, 
              managerData, hallOfFame, boardConfidence,activeSponsor,infrastructure, // <-- Nasze najnowsze dodatki!
              lastResults: slimLastResults
          };
          
          // Zwykły zapis (bez brutalnego usuwania wszystkich 'events' jak wcześniej)
          const compressedJSON = JSON.stringify(saveData);
          
          localStorage.setItem(`pm_save_${currentSlot}`, compressedJSON);
          
          if (typeof setRefreshMenu === 'function') setRefreshMenu(prev => !prev);
          alert(`✅ Gra zapisana pomyślnie w slocie nr ${currentSlot}!`);
          
      } catch (error) {
          console.error("Błąd zapisu gry:", error);
          if (error.name === 'QuotaExceededError' || error.message.includes('exceeded the quota') || error.message.includes('quota')) {
              alert(`❌ PAMIĘĆ PRZEPEŁNIONA!\nZapis na tym slocie jest niemożliwy, bo poprzednie sloty zablokowały pamięć przeglądarki.\n\nRozwiązanie: Wejdź w Menu Główne, skasuj stary zapis (ikona kosza), by zwolnić miejsce na nowy format zapisu!`);
          } else {
              alert(`❌ BŁĄD ZAPISU!\nPowód: ${error.message}`);
          }
      }
  };

  // --- BEZPIECZNE WCZYTYWANIE GRY ---
  const loadGame = (slotIndex) => {
      try {
          const saved = localStorage.getItem(`pm_save_${slotIndex}`);
          if (saved) {
              const data = JSON.parse(saved);
              setBoardConfidence(data.boardConfidence ?? 100);
              setTeams(data.teams || []);
              setPlayers(data.players || []);
              setTransferList(data.transferList || []); // <--- ODTWARZANIE RYNKU
              setAcademy(data.academy || []);
              setSchedules(data.schedules || [[], [], []]);
              setCurrentView(data.currentView || 'dashboard');
              setWeek(data.week || 1);
              setSeasonNum(data.seasonNum || 1);
              setHallOfFame(data.hallOfFame || []);
              setBudget(data.budget || 0);
              setCupTeams(data.cupTeams || []);
              setCupHistory(data.cupHistory || []);
              setClState(data.clState || { active: false, phase: '', matches: [], history: [] });
              setSeasonHistory(data.seasonHistory || []);
              setMyTeamId(data.myTeamId || null);
              setMyFormation(data.myFormation || '4-4-2');
              setManagerData(data.managerData || { level: 1, xp: 0, sp: 0, skills: { negotiator: 0, tactician: 0, miracle: 0 } });
              setLastResults(data.lastResults || []);
              setActiveSponsor(data.activeSponsor || null);
              setInfrastructure(data.infrastructure || { stadium: 1, training: 1, medical: 1 });
setShowSponsorModal(false);
              setCurrentSlot(slotIndex);
              setAppMode('GAME');
          } else {
              alert("❌ Ten slot zapisu jest pusty lub został uszkodzony!");
          }
      } catch (error) {
          console.error("Błąd ładowania gry:", error);
          alert("❌ Błąd podczas wczytywania! Plik zapisu jest uszkodzony.");
      }
  };

  const deleteSave = (slotIndex) => {
      if(window.confirm(`Czy na pewno chcesz bezpowrotnie usunąć zapis z kariery w slocie nr ${slotIndex}?`)) {
          localStorage.removeItem(`pm_save_${slotIndex}`);
          setRefreshMenu(prev => !prev); // Odświeża widok menu
      }
  };

 const handleNewGameClick = (slotIndex) => {
      setCurrentSlot(slotIndex);
      // Całkowity reset stanu gry, żeby nic nie "przeszło" ze starego save'a
      setTeams([]); 
      setPlayers([]); 
      setAcademy([]); 
      setBoardConfidence(100);
      setSeasonHistory([]);
      setCupHistory([]); 
      setClState(null); 
      setLastResults([]); 
      setHallOfFame([]);
      setBudget(0);
      setSeasonNum(1); 
      setWeek(1);
      setActiveSponsor(null);
setShowSponsorModal(false);
setInfrastructure({ stadium: 1, training: 1, medical: 1 });
      
      // --- KLUCZOWE POPRAWKI ---
      setMyTeamId(null); // Gra "zapomina" stary klub, wymuszając ekran wyboru!
      setMyFormation('4-4-2');
      setCurrentView('dashboard'); // Zabezpieczenie widoku
      
      setAppMode('TEAM_SELECT');
  };

  useEffect(() => {
      menuAudioRef.current.loop = true; menuAudioRef.current.volume = 0.3;
      matchAudioRef.current.loop = true; matchAudioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
      if (isMuted || appMode === 'EXIT') {
          menuAudioRef.current.pause(); matchAudioRef.current.pause();
      } else if (isSimulating) {
          menuAudioRef.current.pause();
          if (matchAudioRef.current.paused) { matchAudioRef.current.currentTime = 0; matchAudioRef.current.play().catch(e=>{}); }
      } else {
          matchAudioRef.current.pause();
          if (menuAudioRef.current.paused) menuAudioRef.current.play().catch(e=>{});
      }
  }, [isSimulating, isMuted, appMode]);

  useEffect(() => {
      let interval;
      if (isSimulating && simulationTime <= 90) {
          interval = setInterval(() => setSimulationTime(p => p >= 90 ? 90 : p + 1), 80);
      }
      return () => clearInterval(interval);
  }, [isSimulating, simulationTime]);

  

  const refreshTransferList = (currentPlayers, userTeamId) => {
      // Odrzucamy wypożyczonych i graczy starych (powyżej 33 lat)
      const candidates = currentPlayers.filter(p => p.teamId !== userTeamId && !p.loanedFrom && p.age <= 33);
      
      // Filtrujemy tylko ATRAKCYJNYCH graczy:
      // 1. Młodzi (do 23 lat) z wysokim potencjałem (min. 75)
      // 2. Ukształtowani (do 30 lat) z solidnym OVR (min. 68)
      // 3. Po prostu gwiazdy (OVR 80+)
      const attractive = candidates.filter(p => 
          (p.age <= 23 && p.potential >= 75) || 
          (p.skill >= 68 && p.age <= 30) ||     
          (p.skill >= 80)                       
      );

      // Jeśli przez przypadek brakuje graczy na rynku, bierzemy z ogólnej puli
      const pool = attractive.length >= 15 ? attractive : candidates;

      // Tasujemy i wybieramy 15
      const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, 15);
      
      // Na koniec sortujemy sklep od najsilniejszych do najsłabszych dla wygody
      const finalMarket = shuffled.sort((a,b) => b.skill - a.skill);
      setTransferList(finalMarket);
  };

  const handleCountrySelect = (countryCode) => {
      console.log("Wybrano kraj:", countryCode); // Do debugowania (F12)

      // 1. Sprawdzenie czy dane istnieją
      if (!TEAMS_DATA || TEAMS_DATA.length === 0) {
          alert("BŁĄD: Nie znaleziono drużyn w pliku data.js! Sprawdź importy.");
          return;
      }

      // 2. Reset i ustawienia
      let allTeams = TEAMS_DATA.map(t => ({...t, points:0, played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0}));
      
      setTeams(allTeams); 
      setSeasonNum(1); setWeek(1); setSeasonHistory([]); setNotifications([]); setAcademy([]); setCupHistory([]); setLastResults([]);
      setClState({ active: false, phase: '', matches: [], history: [] });
      
      // 3. ZAPAMIĘTANIE KRAJU (Kluczowe!)
      setUserCountryCode(countryCode);
      
      // 4. Generowanie składów
      let newPlayers = [];
      allTeams.forEach(team => { 
          newPlayers = [...newPlayers, ...generateSquad(team.id, team)]; 
      });
      setPlayers(newPlayers); 
      
      // 5. Terminarz TYLKO dla wybranego kraju
      const countryTeams = allTeams.filter(t => t.country === countryCode);
      
      if (countryTeams.length === 0) {
          alert(`BŁĄD: Brak drużyn dla kraju o kodzie: ${countryCode}`);
          return;
      }

      const s1 = generateLeagueSchedule(countryTeams.filter(t => t.league === 1));
      const s2 = generateLeagueSchedule(countryTeams.filter(t => t.league === 2));
      const s3 = generateLeagueSchedule(countryTeams.filter(t => t.league === 3));
      
      setSchedules([s1, s2, s3]); 
      setCupTeams(countryTeams.map(t => t.id)); 
      
      setAppMode('SELECT');
  };

  const handleTeamSelect = (teamId) => {
    setMyTeamId(teamId); 
    setAppMode('GAME');
    const t = teams.find(tm => tm.id === teamId);
    
    if(t) {
        setActiveLeagueTab(t.league);
        // --- NOWE OBLICZANIE BUDŻETU ---
        const newBudget = calculateDynamicBudget(t);
        setBudget(newBudget);
        // --------------------------------
    }
    setShowSponsorModal(true); // Otwiera ekran wyboru sponsora na start!
    
    refreshTransferList(players, teamId);
  };

  const executeTransfer = (player, type) => {
      if(players.filter(p => p.teamId === myTeamId).length >= 28) { alert("Masz pełny skład (max 28)!"); return; }

      const discount = managerData.skills.negotiator * 0.05; // 5% zniżki co poziom
      let cost = 0;
      let newPlayerObj = { ...player };

      if (type === 'buy') {
          cost = Math.floor(player.value * (1 - discount));
          newPlayerObj.teamId = myTeamId;
          newPlayerObj.isStarter = false;
          delete newPlayerObj.loanedFrom;
          delete newPlayerObj.buyOption;
      } 
      else if (type === 'loan') {
          cost = Math.floor(player.value * 0.1); 
          newPlayerObj.teamId = myTeamId;
          newPlayerObj.isStarter = false;
          newPlayerObj.loanedFrom = player.teamId; 
      }
      else if (type === 'loan_opt') {
          cost = Math.floor(player.value * 0.15); 
          newPlayerObj.teamId = myTeamId;
          newPlayerObj.isStarter = false;
          newPlayerObj.loanedFrom = player.teamId;
          newPlayerObj.buyOption = Math.floor(player.value * 1.1); 
      }

      if (budget < cost) { alert(`Brak środków! Potrzebujesz ${formatMoney(cost)}`); return; }

      if(window.confirm(`Czy na pewno? Koszt: ${formatMoney(cost)}`)) {
          setBudget(prev => prev - cost);
          setPlayers(prev => prev.map(p => p.id === player.id ? newPlayerObj : p));
          setTransferList(prev => prev.filter(p => p.id !== player.id));
          alert("Transfer udany!");
      }
  };

  // --- NOWA FUNKCJA SPRZEDAŻY WŁASNEGO ZAWODNIKA ---
  // --- NOWA FUNKCJA SPRZEDAŻY WŁASNEGO ZAWODNIKA (Z auto-uzupełnianiem składu) ---
  const sellOwnPlayer = (player) => {
      const myCount = players.filter(p => p.teamId === myTeamId).length;
      if (myCount <= 14) { alert("Zarząd blokuje transfer: Masz zbyt wąską kadrę"); return; }

     // Zmieniamy system: Startujesz od 75%, a każdy punkt to +5% (aż do 90% wartości!)
      const currentSellPercentage = 75 + (managerData.skills.negotiator * 5);
      const sellPrice = Math.floor(player.value * (currentSellPercentage / 100));

      if(window.confirm(`Czy chcesz sprzedać zawodnika ${player.name} za ${formatMoney(sellPrice)}? \n(Dzięki zdolnościom Negocjatora, to aż ${currentSellPercentage}% jego wartości rynkowej!)`)) {
          setBudget(prev => prev + sellPrice);
          
          setPlayers(prev => {
              // 1. Usuwamy gracza z gry
              let newPlayers = prev.filter(p => p.id !== player.id);
              
              // 2. Jeśli sprzedany gracz był w wyjściowej 11-stce, łatamy dziurę!
              if (player.isStarter) {
                  // Szukamy kogoś na ławce w naszym zespole
                  const myBench = newPlayers.filter(p => p.teamId === myTeamId && !p.isStarter);
                  
                  if (myBench.length > 0) {
                      // Szukamy zmiennika na TEJ SAMEJ pozycji
                      let sub = myBench.find(p => p.position === player.position);
                      
                      // Jeśli nie mamy nikogo na tę pozycję, bierzemy kogokolwiek z ławki
                      if (!sub) sub = myBench[0]; 
                      
                      // Awansujemy go do 1. składu
                      newPlayers = newPlayers.map(p => p.id === sub.id ? { ...p, isStarter: true } : p);
                      
                      alert(`Sprzedano! Zarabiasz ${formatMoney(sellPrice)}.\n🔄 Luka w składzie załatana: ${sub.name} (${sub.position}) wchodzi z rezerw!`);
                  } else {
                      alert(`Sprzedano! Zarabiasz ${formatMoney(sellPrice)}.`);
                  }
              } else {
                  alert(`Sprzedano! Zarabiasz ${formatMoney(sellPrice)}.`);
              }
              
              return newPlayers;
          });
          
          setSelectedPlayerForDetails(null); // Zamknij modal
      }
  };

 const triggerBuyOption = (player) => {
      if (!player.buyOption) return;
      if (budget < player.buyOption) { alert("Brak środków na wykup!"); return; }
      
      if(window.confirm(`Wykupić zawodnika za ${formatMoney(player.buyOption)}?`)) {
          setBudget(prev => prev - player.buyOption);
          setPlayers(prev => prev.map(p => {
              if (p.id === player.id) {
                  const updated = { ...p };
                  delete updated.loanedFrom;
                  delete updated.buyOption;
                  return updated;
              }
              return p;
          }));
          setSelectedPlayerForDetails(null); // <-- TO ZAMYKA OKNO I ODŚWIEŻA STAN
          alert("Zawodnik wykupiony na stałe!");
      }
  };

 const handleSwapRequest = (playerId) => {
      // 1. Wybór pierwszego zawodnika do zmiany
      if (swapSourceId === null) { 
          setSwapSourceId(playerId); 
          setSelectedPlayerForDetails(null); 
          return;
      } 
      // 2. Odkliknięcie tego samego zawodnika
      if (swapSourceId === playerId) { 
          setSwapSourceId(null); 
          return;
      } 
      
      const p1 = players.find(p => p.id === swapSourceId);
      const p2 = players.find(p => p.id === playerId);
      
      if(!p1 || !p2) {
          setSwapSourceId(null);
          return;
      }

      // --- 3. WALIDACJA FORMACJI (Tylko gdy zamieniamy rezerwę z 1. składem) ---
      // --- 3. WALIDACJA FORMACJI (Tylko gdy zamieniamy rezerwę z 1. składem) ---
      if (p1.isStarter !== p2.isStarter) {
          const starterGoingToBench = p1.isStarter ? p1 : p2;
          const benchGoingToStarter = p1.isStarter ? p2 : p1;
          
          if ((benchGoingToStarter.suspension || 0) > 0) {
              alert("❌ Błąd: Ten zawodnik pauzuje za kartki i nie może zagrać!");
              setSwapSourceId(null); return;
          }
          if ((benchGoingToStarter.injury || 0) > 0) {
              alert("❌ Błąd: Ten zawodnik jest kontuzjowany!");
              setSwapSourceId(null); return;
          }

          // Pobieramy aktualny 1. skład
          let myStarters = players.filter(p => p.teamId === myTeamId && p.isStarter);
          
          // Symulujemy zmianę
          myStarters = myStarters.filter(p => p.id !== starterGoingToBench.id);
          myStarters.push(benchGoingToStarter);

          // Liczymy zawodników na pozycjach po zmianie
          const counts = { BR: 0, OBR: 0, POM: 0, NAP: 0 };
          myStarters.forEach(p => counts[p.position] = (counts[p.position] || 0) + 1);

          // SPRAWDZANIE LIMITÓW
          if (counts.BR !== 1) { 
              alert("❌ Błąd taktyczny: Musisz mieć dokładnie jednego bramkarza (BR)!"); 
              setSwapSourceId(null); return; 
          }
          if (counts.OBR < 3 || counts.OBR > 5) { 
              alert(`❌ Błąd taktyczny: Niewłaściwa liczba obrońców (${counts.OBR}). Wymagane: od 3 do 5!`); 
              setSwapSourceId(null); return; 
          }
          if (counts.POM < 2 || counts.POM > 5) { 
              alert(`❌ Błąd taktyczny: Niewłaściwa liczba pomocników (${counts.POM}). Wymagane: od 2 do 5!`); 
              setSwapSourceId(null); return; 
          }
          if (counts.NAP < 1 || counts.NAP > 4) { 
              alert(`❌ Błąd taktyczny: Niewłaściwa liczba napastników (${counts.NAP}). Wymagane: od 1 do 4!`); 
              setSwapSourceId(null); return; 
          }
      }

      // 4. Jeśli taktyka jest prawidłowa, dokonujemy zamiany
      const s1 = p1.isStarter; 
      const s2 = p2.isStarter;
      
      setPlayers(prev => prev.map(p => {
          if(p.id === swapSourceId) return {...p, isStarter: s2};
          if(p.id === playerId) return {...p, isStarter: s1};
          return p;
      }));
      
      setSwapSourceId(null); 
      setSelectedPlayerForDetails(null);
  };

  const sendScout = (region) => {
      // --- SKILL RPG: ŁOWCA TALENTÓW (Zniżka na skauting) ---
      const scoutLevel = managerData?.skills?.scout || 0;
      const discount = scoutLevel * 0.15; // 15% taniej za każdy poziom!
      const finalCost = Math.floor(region.cost * (1 - discount));

      if (budget < finalCost) { alert(`Brak środków! Potrzebujesz ${formatMoney(finalCost)}`); return; }
      
      setBudget(prev => prev - finalCost);
      const count = Math.floor(Math.random() * 2) + 1; 
      let newbies = []; 
      
      for(let i=0; i<count; i++) {
          let j = generateJunior(region.id);
          // --- SKILL RPG: ŁOWCA TALENTÓW (Lepsze statystyki juniorów) ---
          if (scoutLevel > 0) {
              j.skill += (scoutLevel * 2); // +2/+4/+6 OVR na start
              j.potential += (scoutLevel * 3); // +3/+6/+9 Potencjału!
              j.value = calculatePlayerValue(j.skill, j.potential, j.age);
          }
          newbies.push(j);
      }
      
      setAcademy(prev => [...prev, ...newbies]);
      alert(`Skaut wrócił z ${region.name}! Znaleziono ${count} młodych talentów.\nKoszt ekspedycji: ${formatMoney(finalCost)}`);
  };

  const promoteJunior = (id) => {
      const jun = academy.find(j => j.id === id);
      if (jun.age < 16) { alert("Zawodnik jest za młody! Kontrakt od 16 lat."); return; }
      if (players.filter(p => p.teamId === myTeamId).length >= 28) { alert("Masz pełny skład!"); return; }
      setAcademy(prev => prev.filter(j => j.id !== id));
      setPlayers(prev => [...prev, { ...jun, teamId: myTeamId, isStarter: false }]);
      alert(`${jun.name} dołączył do pierwszej drużyny!`);
  };

  const fireJunior = (id) => {
      if(window.confirm("Czy na pewno chcesz pożegnać tego zawodnika?")) {
          setAcademy(prev => prev.filter(j => j.id !== id));
      }
  };

 const playCupRound = (currentPlayers) => {
    if(cupTeams.length < 2) return; 
    let remaining = [...cupTeams].sort(() => 0.5 - Math.random());
    let winners = [], results = [];
    for(let i=0; i<remaining.length; i+=2) {
        if(!remaining[i+1]) { winners.push(remaining[i]); continue; }
        const tA = teams.find(t => t.id === remaining[i]); const tB = teams.find(t => t.id === remaining[i+1]);
        if (!tA || !tB) continue;
        // Teraz Puchar Polski też widzi Twoją formację i skille menedżera!
        const { scoreA, scoreB } = simulateMatch(tA, tB, currentPlayers, myTeamId, myFormation, managerData);
        
        let wId = scoreA > scoreB ? tA.id : (scoreB > scoreA ? tB.id : (Math.random()>0.5 ? tA.id : tB.id));
        const isPenalties = scoreA === scoreB; // NOWE: Wykrywanie rzutów karnych
        
        winners.push(wId); 
        results.push({ host: tA.name, guest: tB.name, hostId: tA.id, guestId: tB.id, scoreA: scoreA, scoreB: scoreB, winnerId: wId, isPenalties });
    }
    setCupTeams(winners); setCupHistory(prev => [...prev, { round: `Runda ${prev.length+1}`, matches: results }]);
  };

  const playChampionsLeagueRound = () => {
      // Jeśli LM nieaktywna lub za mało drużyn - nic nie rób
      if (!clState.active || clState.teams.length < 2) return;

      let currentMatches = [];
      let nextRoundTeams = [];
      let roundName = "";
      let nextPhase = "";

      // Sprawdzamy, czy obecny tydzień to tydzień LM
      if ([CL_WEEKS.RO32, CL_WEEKS.RO16, CL_WEEKS.QF, CL_WEEKS.SF, CL_WEEKS.FINAL].includes(week)) {
          
          if (week === CL_WEEKS.RO32) roundName = "1/16 Finału";
          else if (week === CL_WEEKS.RO16) roundName = "1/8 Finału";
          else if (week === CL_WEEKS.QF) roundName = "Ćwierćfinał";
          else if (week === CL_WEEKS.SF) roundName = "Półfinał";
          else roundName = "Finał";
          
          let pairTeams = [...clState.teams];
          
          // Gramy parami (0 vs 1, 2 vs 3 itd.)
          for(let i=0; i<pairTeams.length; i+=2) {
              const tA = teams.find(t => t.id === pairTeams[i]);
              const tB = teams.find(t => t.id === pairTeams[i+1]);
              if(tA && tB) {
                  const res = simulateMatch(tA, tB, players, myTeamId, myFormation, managerData);
                  const winnerId = res.scoreA > res.scoreB ? tA.id : (res.scoreB > res.scoreA ? tB.id : (Math.random()>0.5 ? tA.id : tB.id));
                  const isPenalties = res.scoreA === res.scoreB; // NOWE
                  
                  // NOWE: dodano hostId, guestId i isPenalties
                  currentMatches.push({ ...res, host: tA.name, guest: tB.name, hostId: tA.id, guestId: tB.id, winnerId, isPenalties });
                  nextRoundTeams.push(winnerId);
              }
          }
          
          // Ustalanie kolejnej fazy
          if (week === CL_WEEKS.RO32) nextPhase = 'ro16';
          else if (week === CL_WEEKS.RO16) nextPhase = 'qf';
          else if (week === CL_WEEKS.QF) nextPhase = 'sf';
          else if (week === CL_WEEKS.SF) nextPhase = 'final';
          else nextPhase = 'winner';
          
          if (week === CL_WEEKS.FINAL) {
              const winner = teams.find(t => t.id === nextRoundTeams[0]);
              setNotifications(prev => [{text: `🏆 LIGA MISTRZÓW: ${winner.name} ZDOBYWA PUCHAR!`, value: 10000000}, ...prev]);
              if (winner.id === myTeamId) setBudget(b => b + 10000000); // Kasa za wygraną
          }
      } else {
          return; // To nie jest tydzień LM
      }

      // Aktualizacja stanu LM
      if (currentMatches.length > 0) {
          setClState(prev => ({ 
              ...prev, 
              phase: nextPhase, 
              teams: nextRoundTeams, 
              matches: currentMatches,
              history: [...prev.history, { round: roundName, matches: currentMatches }] 
          }));
      }
  };

 // Podmień całą funkcję startWeekSimulation na tę:

  const startWeekSimulation = () => {
    // --- WALIDACJA SKŁADU PRZED MECZEM (NOWE) ---
    const mySquad = players.filter(p => p.teamId === myTeamId);
    const starters = mySquad.filter(p => p.isStarter);

  // --- KULOODPORNY SILNIK DECYZJI FABULARNYCH ---
  const handleResolveEvent = (event, choice) => {
      // 1. Aktualizacja Kasy i Zarządu
      if (choice.budgetChange) setBudget(b => b + choice.budgetChange);
      if (choice.boardChange) setBoardConfidence(b => Math.max(0, Math.min(100, b + choice.boardChange)));
      
      // 2. Bezpieczna aktualizacja graczy
      setPlayers(prev => prev.map(p => {
          if (p.teamId !== myTeamId) return p; 
          let newP = { ...p };
          
          if (event.targetPlayerId && p.id === event.targetPlayerId) {
              if (choice.moraleChange) newP.morale = Math.max(0, Math.min(100, (newP.morale || 100) + choice.moraleChange));
              if (choice.injuryChange !== undefined && choice.injuryChange > 0) newP.injury = choice.injuryChange;
          }
          if (choice.globalMoraleChange) {
              newP.morale = Math.max(0, Math.min(100, (newP.morale || 100) + choice.globalMoraleChange));
          }
          return newP;
      }));

      // 3. Logowanie i zamknięcie
      setNotifications(prev => [{text: `📰 Prasa: ${choice.logText}`, value: choice.budgetChange || 0}, ...prev]);
      setActiveEvent(null); 
  };
    // 1. Sprawdź czy jest dokładnie 11 graczy
    if (starters.length !== 11) {
        alert(`Nieprawidłowa liczba zawodników w pierwszym składzie! \nMasz: ${starters.length}. Wymagane: 11.`);
        // Przełącz widok na skład, żeby gracz mógł to poprawić
        setCurrentView('squad'); 
        return; // STOP - nie symulujemy meczu
    }

    // 2. Sprawdź czy jest bramkarz
    const hasGK = starters.some(p => p.position === 'BR');
    if (!hasGK) {
        alert("W pierwszym składzie brakuje bramkarza (BR)!");
        setCurrentView('squad');
        return; // STOP
    }

    // 3. Sprawdź czy w pierwszym składzie nie ma kontuzjowanych
    const injuredStarter = starters.find(p => p.injury > 0);
    if (injuredStarter) {
        alert(`Zawodnik ${injuredStarter.name} ma kontuzję i nie może grać! Zdejmij go ze składu.`);
        setCurrentView('squad');
        return; // STOP
    }
    // ---------------------------------------------

    if (week > 34) return;
    if (CUP_WEEKS.includes(week)) playCupRound(players);
    if (Object.values(CL_WEEKS).includes(week)) playChampionsLeagueRound();
    if (week % 4 === 0) refreshTransferList(players, myTeamId);

    let allRes = [], myMatch = null;
    schedules.forEach((leagueSchedule) => {
        const m = leagueSchedule[week - 1]; 
        if(m) {
            m.forEach(match => {
                const tA = teams.find(t => t.id === match.home); const tB = teams.find(t => t.id === match.away);
                const res = simulateMatch(tA, tB, players);
                if (tA.id === myTeamId || tB.id === myTeamId) myMatch = res;
                allRes.push({ ...res, teamAId: tA.id, teamBId: tB.id });
            });
        }
    });
    setPendingUpdates(allRes); setSimulationData(myMatch); setSimulationTime(0); setIsSimulating(true);
  };

 const finishWeekLogic = () => {
      setIsSimulating(false);
      let earnedXP = 0;
      if (!pendingUpdates) return;
      
      // 1. Kopia stanów
      let newTeams = JSON.parse(JSON.stringify(teams)); 
      // GŁĘBOKA KOPIA: Dzięki temu React odświeży OVR na kartach!
      let newPlayers = players.map(p => ({ ...p, stats: { ...p.stats } })); 
      
      // DEKREMENTACJA KAR ZA KARTKI (Odbycie kary) - ZGUBIONY KOD PRZYWRÓCONY!
      newPlayers.forEach(p => {
          if (p.suspension > 0) p.suspension -= 1;
      });

      // --- NOWOŚĆ: SYSTEM MORALI I BUNTÓW ZAWODNIKÓW ---
      let forcedSales = [];
      let incomeFromRebels = 0;
      const myTeamPlayers = newPlayers.filter(p => p.teamId === myTeamId);
      const myAvgSkill = myTeamPlayers.reduce((s, p) => s + p.skill, 0) / (myTeamPlayers.length || 1);

      newPlayers.forEach(p => {
          if (p.morale === undefined) p.morale = 100;
          
          if (p.teamId === myTeamId) {
              if (p.isStarter) {
                  p.morale = Math.min(100, p.morale + 10); // Gra w 1. składzie = zadowolony
              } else if (p.injury === 0 && p.suspension === 0) {
                  // Siedzi na ławce mimo że jest w pełni zdatny do gry (Foch!)
                  let moraleDrop = 3;
                  if (p.skill >= myAvgSkill + 2) moraleDrop = 15; // Gwiazda drużyny jest wściekła!
                  else if (p.skill >= myAvgSkill - 3) moraleDrop = 8; // Podstawowy gracz niezadowolony
                  
                  // --- SKILL RPG: PSYCHOLOG (Zmniejsza ubytek morali) ---
                  const motivatorLevel = managerData?.skills?.motivator || 0;
                  if (motivatorLevel > 0) {
                      moraleDrop = Math.max(1, moraleDrop - (motivatorLevel * 3)); // Obcina spadek nawet o 9 punktów!
                  }
                  
                  p.morale -= moraleDrop;
              }

              // BUNT! Zmusza zarząd do sprzedaży (Morale spadło do 0)
              if (p.morale <= 0) {
                  if (p.loanedFrom) {
                      p.teamId = p.loanedFrom; // Wraca obrażony z wypożyczenia
                      forcedSales.push(`➤ ${p.name} (Przerwał wypożyczenie z powodu braku gry)`);
                  } else {
                      const sellPrice = Math.floor(p.value * 0.3); // Zarząd opycha go za 30% wartości!
                      incomeFromRebels += sellPrice;
                      forcedSales.push(`➤ ${p.name} (Zarząd sprzedał buntownika za ${formatMoney(sellPrice)})`);
                      p.teamId = null; // Staje się wolnym agentem / wyrzucony z gry
                  }
              }
          }
      });
      
      // Powiadomienie na twarz o buncie w szatni!
      if (forcedSales.length > 0) {
          setBudget(b => b + incomeFromRebels);
          alert(`🚨 BUNT W SZATNI!\n\nTwoi zawodnicy, którzy zbyt długo siedzieli na ławce rezerwowych, osiągnęli 0% Morali i zażądali natychmiastowego odejścia!\n\nKlub opuścili:\n${forcedSales.join('\n')}`);
      }
      let newSchedules = JSON.parse(JSON.stringify(schedules));

      const myTeamData = newTeams.find(t => t.id === myTeamId);
      
      // 2. Przetwarzanie wyników (Twoja liga / mecze z terminarza)
      if (pendingUpdates) {
          pendingUpdates.forEach(res => {
              // A. Aktualizacja tabeli
              const tA = newTeams.find(t => String(t.id) === String(res.teamAId)); 
              const tB = newTeams.find(t => String(t.id) === String(res.teamBId));
              // Zdobywanie XP
            if (tA.id === myTeamId) earnedXP += res.scoreA > res.scoreB ? 100 : res.scoreA === res.scoreB ? 30 : 10;
             if (tB.id === myTeamId) earnedXP += res.scoreB > res.scoreA ? 100 : res.scoreA === res.scoreB ? 30 : 10;
              
              if (tA && tB) {
                  tA.played++; tA.goalsFor+=res.scoreA; tA.goalsAgainst+=res.scoreB; 
                  tB.played++; tB.goalsFor+=res.scoreB; tB.goalsAgainst+=res.scoreA;
                  
                  if(res.scoreA > res.scoreB) { tA.points+=3; tA.won++; tB.lost++; } 
                  else if(res.scoreA===res.scoreB) { tA.points++; tA.drawn++; tB.points++; tB.drawn++; } 
                  else { tA.lost++; tB.points+=3; tB.won++; }
                  // --- NOWOŚĆ: ZAUFANIE ZARZĄDU (PRESJA W TRAKCIE SEZONU) ---
                  if (tA.id === myTeamId || tB.id === myTeamId) {
                      const isWin = (tA.id === myTeamId && res.scoreA > res.scoreB) || (tB.id === myTeamId && res.scoreB > res.scoreA);
                      const isDraw = res.scoreA === res.scoreB;
                      
                      setBoardConfidence(prev => {
                          let change = isWin ? 5 : isDraw ? 0 : -6;
                          // Jeśli to 1. Liga (giganci) - remis to wręcz porażka, a za przegraną lecą głowy!
                          if (myTeamData.league === 1) change = isWin ? 3 : isDraw ? -2 : -12; 
                          // Jeśli to 3. Liga (słabeusze) - łatwiej o zadowolenie
                          if (myTeamData.league === 3) change = isWin ? 6 : isDraw ? 2 : -4;   
                          
                          return Math.max(0, Math.min(100, prev + change));
                      });
                  }

                  // Wyniki na pulpicie (z pełnymi statystykami)
                  if (tA.id === myTeamId || tB.id === myTeamId) {
                      setLastResults(prev => [{ 
                          host: tA.name, guest: tB.name, 
                          scoreA: res.scoreA, scoreB: res.scoreB, events: res.events,
                          savesA: res.savesA, savesB: res.savesB, chancesA: res.chancesA, chancesB: res.chancesB,
                          foulsA: res.foulsA, foulsB: res.foulsB, cornersA: res.cornersA, cornersB: res.cornersB,
                          freeKicksA: res.freeKicksA, freeKicksB: res.freeKicksB, penaltiesA: res.penaltiesA, penaltiesB: res.penaltiesB
                      }, ...prev].slice(0, 10));
                  }

                  // B. Zapisywanie wyniku do terminarza
                  const leagueIndex = (tA.league || 1) - 1;
                  if (newSchedules[leagueIndex] && newSchedules[leagueIndex][week - 1]) {
                      const matchInSchedule = newSchedules[leagueIndex][week - 1].find(m => 
                          (String(m.home) === String(tA.id) && String(m.away) === String(tB.id)) ||
                          (String(m.home) === String(tB.id) && String(m.away) === String(tA.id))
                      );
                      
                      if (matchInSchedule) {
                          if (String(matchInSchedule.home) === String(tA.id)) {
                              matchInSchedule.scoreHome = res.scoreA;
                              matchInSchedule.scoreAway = res.scoreB;
                          } else {
                              matchInSchedule.scoreHome = res.scoreB;
                              matchInSchedule.scoreAway = res.scoreA;
                          }
                          matchInSchedule.isPlayed = true; 
                      }
                  }
              }

             // C. Statystyki piłkarzy, KONTUZJE i BEZPOŚREDNI ROZWÓJ ZA MECZ
              res.events.forEach(ev => {
                  if (ev.type === 'goal') {
                      if (ev.scorer && ev.scorer.id) {
                          const p = newPlayers.find(x => x.id === ev.scorer.id);
                          if (p) {
                              p.goals = (p.goals || 0) + 1;
                              p.form = Math.min(10, (p.form || 5) + 1.2); 
                              
                              // ZNERFIONE: 12% szans za gola (było 35%)
                              if (p.age <= 26 && p.skill < p.potential && Math.random() < 0.12) {
                                  p.skill++;
                                  if (p.stats) p.stats.shooting = Math.min(99, p.stats.shooting + 1);
                                  p.value = calculatePlayerValue(p.skill, p.potential, p.age);
                              }
                          }
                      }
                      if (ev.assist && ev.assist.id) {
                          const a = newPlayers.find(x => x.id === ev.assist.id);
                          if (a) {
                              a.assists = (a.assists || 0) + 1;
                              a.form = Math.min(10, (a.form || 5) + 0.8);
                              
                              // ZNERFIONE: 8% szans za asystę (było 25%)
                              if (a.age <= 26 && a.skill < a.potential && Math.random() < 0.08) {
                                  a.skill++;
                                  if (a.stats) a.stats.passing = Math.min(99, a.stats.passing + 1);
                                  a.value = calculatePlayerValue(a.skill, a.potential, a.age);
                              }
                          }
                      }
                  } else if (ev.type === 'injury' && ev.player) {
                      const injured = newPlayers.find(x => x.id === ev.player.id);
                      if (injured) {
                          injured.injury = ev.weeks;
                          injured.form = Math.max(1, (injured.form || 5) - 2); 
                      }
                  // --- NOWE: KARTKI ---
                  } else if (ev.type === 'yellow' && ev.player) {
                      const p = newPlayers.find(x => x.id === ev.player.id);
                      if (p) {
                          p.yellowCards = (p.yellowCards || 0) + 1;
                          // Reguła: 4. żółta = pauza, potem każda kolejna co 2. żółtą (6, 8, 10...) = pauza
                          if (p.yellowCards === 4 || (p.yellowCards > 4 && (p.yellowCards - 4) % 2 === 0)) {
                              p.suspension = (p.suspension || 0) + 1;
                          }
                      }
                  } else if (ev.type === 'red' && ev.player) {
                      const p = newPlayers.find(x => x.id === ev.player.id);
                      if (p) {
                          p.redCards = (p.redCards || 0) + 1;
                          p.suspension = (p.suspension || 0) + 1; // Bezpośrednia czerwona = od razu pauza
                      }
                  }
              });

              // D. FORMA I ROZWÓJ OBRONY (Czyste konta i obrony)
              const teamAStarters = newPlayers.filter(p => String(p.teamId) === String(res.teamAId) && p.isStarter);
              const teamBStarters = newPlayers.filter(p => String(p.teamId) === String(res.teamBId) && p.isStarter);

              const updateDefenseForm = (squad, goalsConceded, saves) => {
                  squad.forEach(p => {
                      if (p.position === 'BR' || p.position === 'OBR') {
                          let formChange = 0;
                          
                          if (goalsConceded === 0) {
                              formChange += 1.2; 
                              p.cleanSheets = (p.cleanSheets || 0) + 1; // NOWE: Zbieranie czystych kont!
                              // ZNERFIONE: 10% szans za czyste konto (było 30%)
                              if (p.age <= 26 && p.skill < p.potential && Math.random() < 0.10) {
                                  p.skill++; 
                                  if (p.stats) p.stats.defense = Math.min(99, p.stats.defense + 1);
                                  p.value = calculatePlayerValue(p.skill, p.potential, p.age);
                              }
                          } else if (goalsConceded >= 3) {
                              formChange -= 1.0; 
                          }
                          
                          formChange += (saves * 0.15); 
                          p.form = Math.min(10, Math.max(1, (p.form || 5) + formChange));
                      }
                  });
              };

              updateDefenseForm(teamAStarters, res.scoreB, res.savesA); 
              updateDefenseForm(teamBStarters, res.scoreA, res.savesB);
          });
      }
// Automatyczne zrzucanie zablokowanych graczy na ławkę!
              // --- NAPRAWA: Zrzucanie zablokowanych graczy na ławkę DLA WSZYSTKICH KLUBÓW (AI też!) ---
              newPlayers.forEach(p => {
                  // Obejmuje zarówno kartki jak i kontuzje!
                  if ((p.suspension > 0 || p.injury > 0) && p.isStarter) {
                      p.isStarter = false;
                      // Komputer i gracz auto-zastępują braki kimś z ławki
                      const teamBench = newPlayers.filter(x => x.teamId === p.teamId && !x.isStarter && (x.suspension || 0) === 0 && (x.injury || 0) === 0);
                      let sub = teamBench.find(x => x.position === p.position);
                      if (!sub && teamBench.length > 0) sub = teamBench[0];
                      if (sub) sub.isStarter = true;
                  }
              });
     // --- NOWE: LECZENIE KONTUZJI I SZYBKI COTYGODNIOWY ROZWÓJ (XP) ---
      newPlayers.forEach(p => {
          if (p.startSeasonSkill === undefined) p.startSeasonSkill = p.skill;
          
          if (p.form > 5) p.form = Math.max(5, p.form - 0.2);
          else if (p.form < 5) p.form = Math.min(5, p.form + 0.2);

          if (p.injury > 0) p.injury -= 1;
          
          if (p.age <= 26 && p.injury === 0) {
              
              // DYNAMICZNY POTENCJAŁ (Znerfiono z 5% na 2% szans)
              if (p.form >= 8 && p.skill >= p.potential - 1) {
                  if (Math.random() < 0.02) { 
                      p.potential = Math.min(99, p.potential + 1);
                  }
              }

              if (p.skill < p.potential) {
                  // ZNERFIONE: Rozwój bazowy (3% starter, 1% ławka) + 2% za wybitną formę
                  let growthChance = p.isStarter ? 0.03 : 0.01; 
                  if (p.form >= 8) growthChance += 0.02; 
                  // --- SKILL RPG: CUDOTWÓRCA (Boost dla rezerwowych) ---
                  if (p.teamId === myTeamId && managerData?.skills?.miracle > 0) {
                      if (!p.isStarter) growthChance += (managerData.skills.miracle * 0.02); // +2/4/6% szans na rozwój!
                  }
                  
                  if (Math.random() < growthChance) {
                      p.skill++;
                      if (p.skill > p.potential) p.skill = p.potential; 

                      const statsKeys = ['pace', 'shooting', 'passing', 'dribbling', 'defense', 'physical'];
                      const randStat = statsKeys[Math.floor(Math.random() * statsKeys.length)];
                      if(p.stats) p.stats[randStat] = Math.min(99, p.stats[randStat] + 1);
                      
                      p.value = calculatePlayerValue(p.skill, p.potential, p.age);
                  }
              }
          }
      });

      // ==========================================================================================
      // 3. INTELIGENTNA SYMULACJA TŁA (Inne ligi / kraje) - POPRAWIONA
      // ==========================================================================================
      newTeams.forEach(t => {
          // Symulujemy tylko drużyny z innych krajów (bo Twoja liga jest symulowana mecz po meczu wyżej)
          if (t.country !== myTeamData.country) {
             const teamsInLeague = newTeams.filter(x => x.country === t.country && x.league === t.league).length;
             const maxMatches = (teamsInLeague - 1) * 2;
             
             if (t.played < maxMatches && t.played < week) {
                 t.played++;

                 // --- NOWA LOGIKA: SIŁA ZESPOŁU MA ZNACZENIE ---
                 
                 // 1. Obliczamy siłę drużyny (0-100)
                 const teamStrength = (t.attack + t.defense) / 2;
                 
                 // 2. Ustalamy średnią siłę rywala w danej lidze (Ghost Opponent)
                 // Liga 1: ~76, Liga 2: ~69, Liga 3: ~63
                 let leagueAvgStrength = 76;
                 if (t.league === 2) leagueAvgStrength = 69;
                 if (t.league === 3) leagueAvgStrength = 63;

                 // 3. Obliczamy przewagę nad średnią ligową
                 // Np. Real Madryt (90) vs Średnia (76) = +14 (Duża przewaga)
                 // Np. Słabeusz (65) vs Średnia (76) = -11 (Duża strata)
                 const advantage = teamStrength - leagueAvgStrength;

                 // 4. Szansa na wygraną (Baza 35% + 1.5% za każdy punkt przewagi)
                 // Real: 35% + (14 * 1.5%) = 35% + 21% = 56% szans na wygraną
                 // Słabeusz: 35% + (-11 * 1.5%) = 35% - 16.5% = 18.5% szans na wygraną
                 let winChance = 0.35 + (advantage * 0.015);
                 let drawChance = 0.28; // Remisy są dość stałe

                 // Limity (żeby nikt nie miał 100% ani 0%)
                 if (winChance > 0.85) winChance = 0.85;
                 if (winChance < 0.10) winChance = 0.10;

                 // 5. Losowanie wyniku i bramek
                 const r = Math.random();
                 let goalsScored = 0;
                 let goalsConceded = 0;

                 if (r < winChance) { 
                     t.points += 3; t.won++; 
                     goalsScored = Math.max(1, Math.floor(Math.random() * 3) + Math.floor(advantage / 10));
                     goalsConceded = Math.floor(Math.random() * 2); 
                 } 
                 else if (r < winChance + drawChance) { 
                     t.points += 1; t.drawn++; 
                     goalsScored = Math.floor(Math.random() * 2); 
                     goalsConceded = goalsScored; 
                 } 
                 else { 
                     t.lost++; 
                     goalsScored = Math.floor(Math.random() * 2);
                     goalsConceded = Math.max(1, Math.floor(Math.random() * 3) - Math.floor(advantage / 10));
                 } 

                 t.goalsFor += goalsScored;
                 t.goalsAgainst += goalsConceded;

                 // --- NAPRAWA ZŁOTEJ PIŁKI: Przydzielanie Goli i Czystych Kont w tle! ---
                 const teamPlayers = newPlayers.filter(p => p.teamId === t.id);
                 if (teamPlayers.length > 0) {
                     // Napastnicy strzelają
                     const attackers = teamPlayers.filter(p => p.position === 'NAP' || p.position === 'POM');
                     for (let i = 0; i < goalsScored; i++) {
                         const scorer = attackers.length > 0 ? attackers[Math.floor(Math.random() * attackers.length)] : teamPlayers[0];
                         scorer.goals = (scorer.goals || 0) + 1;
                         scorer.form = Math.min(10, (scorer.form || 5) + 0.5); // Form rośnie za gola
                         
                         // Asysty
                         if (Math.random() > 0.5) {
                             const assister = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];
                             if (assister.id !== scorer.id) assister.assists = (assister.assists || 0) + 1;
                         }
                     }
                     // Bramkarze bronią
                     if (goalsConceded === 0) {
                         const gk = teamPlayers.find(p => p.position === 'BR');
                         if (gk) gk.cleanSheets = (gk.cleanSheets || 0) + 1;
                     }
                 }
          }
      }});
      // ==========================================================================================


      // Zdarzenia losowe
      // --- NOWOŚĆ: SYSTEM FABUŁY I ZDARZEŃ LOSOWYCH ---
      if (Math.random() < 0.20 && myTeamPlayers.length > 0) { // 20% szans w każdej kolejce na dylemat
          const randomPlayer = myTeamPlayers[Math.floor(Math.random() * myTeamPlayers.length)];
          const topPlayer = [...myTeamPlayers].sort((a,b) => b.skill - a.skill)[0] || randomPlayer;

          const possibleEvents = [
              {
                  title: "Afera w klubie nocnym!",
                  desc: `Twój gwiazdor, ${topPlayer.name}, został przyłapany przez paparazzi w klubie nocnym do 4 nad ranem przed ważnym meczem. Prasa huczy i domaga się konsekwencji!`,
                  targetPlayerId: topPlayer.id,
                  choices: [
                      { text: "Ukarz go grzywną", budgetChange: 50000, moraleChange: -30, boardChange: 5, logText: "Zawieszenie gracza spodobało się zarządowi." },
                      { text: "Broń go w mediach", budgetChange: -20000, moraleChange: 20, boardChange: -5, logText: "Dział PR uciszył sprawę. Zawodnik jest Ci wdzięczny." }
                  ]
              },
              {
                  title: "Niepokojący uraz...",
                  desc: `Podczas wczorajszego treningu siłowego ${randomPlayer.name} zaczął narzekać na kłujący ból w kolanie. Sztab medyczny pyta o Twoją decyzję.`,
                  targetPlayerId: randomPlayer.id,
                  choices: [
                      { text: "Prywatna klinika", budgetChange: -80000, injuryChange: 0, logText: "Błyskawiczne leczenie zapobiegło kontuzji." },
                      { text: "Zwykły lód i maść", budgetChange: 0, injuryChange: 3, logText: "Brak reakcji pogłębił uraz. Zawodnik wypada z gry!" }
                  ]
              },
              {
                  title: "Bunt Kibiców",
                  desc: "Ultrasi protestują przeciwko zbyt wysokim cenom biletów na stadionie i słabemu jedzeniu. Grożą bojkotem i wniesieniem pustych trybun na najbliższy mecz!",
                  choices: [
                      { text: "Zrób promocję (Obniżka)", budgetChange: -120000, boardChange: 15, globalMoraleChange: 5, logText: "Kibice są zachwyceni, atmosfera w klubie rośnie." },
                      { text: "Zignoruj protest", budgetChange: 0, boardChange: -15, globalMoraleChange: -5, logText: "Kibice odwracają się od klubu. Napięta atmosfera." }
                  ]
              },
              {
                  title: "Podejrzany Inwestor",
                  desc: "Ekscentryczny inwestor z Bliskiego Wschodu oferuje potężny zastrzyk gotówki dla klubu, ale pod jednym warunkiem: drużyna wylatuje na męczący mecz pokazowy do Dubaju w środku sezonu.",
                  choices: [
                      { text: "Bierzemy gotówkę!", budgetChange: 800000, globalMoraleChange: -20, logText: "Konto pełne milionów, ale drużyna ledwo oddycha z przemęczenia." },
                      { text: "Odrzuć ofertę", budgetChange: 0, boardChange: 5, globalMoraleChange: 10, logText: "Skupiamy się na lidze. Piłkarze doceniają czas na odpoczynek." }
                  ]
              }
          ];

          const chosenEvent = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
          setActiveEvent(chosenEvent);
      }

      setTeams(newTeams); 
      setPlayers(newPlayers);
      setSchedules(newSchedules); 
      setWeek(p => p+1); 
      // Levelowanie Menedżera
      if (earnedXP > 0) {
          setManagerData(prev => {
              let temp = { ...prev };
              temp.xp += earnedXP;
              let needed = temp.level * 500;
              while (temp.xp >= needed) {
                  temp.xp -= needed;
                  temp.level++;
                  temp.sp++;
                  needed = temp.level * 500;
                  setTimeout(() => alert(`🎉 AWANS MENEDŻERA!\nWbiłeś poziom ${temp.level}! Otrzymujesz Punkt Umiejętności.`), 500);
              }
              return temp;
          });
      }
      // MID-SEASON SACK (Wyrzucenie w trakcie sezonu)
      if (boardConfidence <= 0) {
          alert("🚨 ZWOLNIENIE W TRAKCIE SEZONU!\nZarząd stracił resztki cierpliwości. Seria katastrofalnych wyników sprawiła, że zostałeś wyrzucony ze skutkiem natychmiastowym!");
          setMyTeamId(null);
          setAppMode('JOB_CENTER');
      }
      // --- SKILL RPG: REKIN FINANSJERY (Pasywny dochód co tydzień) ---
      const financierLevel = managerData?.skills?.financier || 0;
      if (financierLevel > 0) {
          const passiveIncome = financierLevel * 30000; // 30k, 60k, 90k DARMOWEJ GOTÓWKI co tydzień!
          setBudget(b => b + passiveIncome);
      }
      setPendingUpdates(null);
      // --- EFEKTY INFRASTRUKTURY KLUBU ---
      if (infrastructure) {
          // 1. STADION - generuje pasywny dochód z biletów co tydzień
          if (infrastructure.stadium > 1) {
              const stadiumIncome = (infrastructure.stadium - 1) * 40000; // 40k, 80k, 120k, 160k co kolejkę!
              setBudget(b => b + stadiumIncome);
          }
          
          // 2. KLINIKA i TRENING - leczą i trenują całą kadrę!
          newPlayers.forEach(p => {
              if (p.teamId === myTeamId) {
                  // Trening: Szansa na darmowe XP w każdym tygodniu dla wszystkich graczy
                  if (infrastructure.training > 1 && Math.random() < (infrastructure.training * 0.015)) {
                      if (p.skill < p.potential) {
                          p.skill++;
                          p.value = calculatePlayerValue(p.skill, p.potential, p.age);
                      }
                  }
                  // Klinika: Szybsze leczenie i darmowy boost do formy
                  if (infrastructure.medical > 1 && p.injury > 0) {
                      if (Math.random() < (infrastructure.medical * 0.1)) p.injury -= 1; // Szansa na ucięcie dodatkowego tygodnia kontuzji!
                  }
                  if (infrastructure.medical > 2 && p.form < 6 && Math.random() < 0.2) p.form += 0.5; // Odnowa biologiczna
              }
          });
      }
  };
  

  const simulatePlayoffWinner = (teams) => {
      const rand = Math.random() * 100;
      if (rand < 40) return teams[0]; else if (rand < 70) return teams[1]; else if (rand < 90) return teams[2]; else return teams[3];
  };

  const startNewSeason = () => {
    try {
      const myTeamNow = teams.find(t => t.id === myTeamId);
      if (!myTeamNow) {
        console.error("Błąd: Nie znaleziono Twojej drużyny.");
        return;
      }

      // === 1. TWARDA WALIDACJA FINANSOWA PRZED CZYMKOLWIEK ===
      const myLeagueTeamsTest = teams.filter(t => t.league === myTeamNow.league && t.country === myTeamNow.country).sort((a, b) => b.points - a.points);
      const myPositionTest = myLeagueTeamsTest.findIndex(t => t.id === myTeamId) + 1;

      // --- NOWOŚĆ: CELE ZARZĄDU NA KONIEC SEZONU ---
      let isFired = false;
      let expectedPos = myTeamNow.league === 1 ? 4 : myTeamNow.league === 2 ? 8 : 14;
      if (myPositionTest > expectedPos + 2) {
          isFired = true; // Drastyczny brak realizacji celów!
      }
      
      const myCurrentSquad = players.filter(p => p.teamId === myTeamId);
      const totalWageBill = myCurrentSquad.reduce((sum, p) => sum + (p.wage || 0), 0);
      
      let prizeMoney = 0;
      if (myTeamNow.league === 1) {
          prizeMoney = Math.max(500000, 15000000 - ((myPositionTest - 1) * 800000));
      } else if (myTeamNow.league === 2) {
          prizeMoney = Math.max(100000, 3000000 - ((myPositionTest - 1) * 150000));
      } else {
          prizeMoney = Math.max(20000, 500000 - ((myPositionTest - 1) * 25000));
      }

      const currentOVR = calculateTeamOVR(myTeamId, players);
      const sponsorMoney = calculateDynamicBudget({ ...myTeamNow, attack: currentOVR, defense: currentOVR, league: myTeamNow.league }) * 0.4;
      const totalIncome = Math.floor(prizeMoney + sponsorMoney);
      
      let projectedBudget = budget + totalIncome - totalWageBill;

      if (projectedBudget < 0) {
          if (myCurrentSquad.length <= 12) {
              alert(`⚠️ KRYZYS FINANSOWY KLUBU!\n\nJesteś zadłużony na ${formatMoney(Math.abs(projectedBudget))}, a Twój skład jest zbyt wąski (tylko 12 graczy), by kogokolwiek sprzedać.\n\nZarząd zaciągnął pożyczkę ratunkową, by spłacić pensje. Twój budżet wynosi na start 0 €.`);
              projectedBudget = 0;
          } else {
              alert(`❌ WIDMO BANKRUCTWA!\n\nZarząd zablokował start rozgrywek! Nie stać Cię na wypłacenie pensji.\n\nObecny budżet: ${formatMoney(budget)}\nWpływy: +${formatMoney(totalIncome)}\nZobowiązania: -${formatMoney(totalWageBill)}\n\nBRAKUJE: ${formatMoney(Math.abs(projectedBudget))}\n\nSprzedaj kogoś, aby uregulować długi!`);
              setCurrentView('squad'); 
              return; // ZATRZYMANIE TWORZENIA SEZONU!
          }
      }

      // Kopia drużyn
      let nextTeams = JSON.parse(JSON.stringify(teams)); 
      let logs = [];
      let loanReturnsLog = [];

      // --- 2. HISTORIA I OSIĄGNIĘCIA ---
      let myCupResult = "Brak udziału";
      if (cupHistory && cupHistory.length > 0) {
        for (let i = cupHistory.length - 1; i >= 0; i--) {
          const round = cupHistory[i];
          if (round && round.matches) {
            const myMatch = round.matches.find(m => String(m.hostId) === String(myTeamId) || String(m.guestId) === String(myTeamId));
            if (myMatch) {
              if (String(myMatch.winnerId) === String(myTeamId)) {
                if (i === cupHistory.length - 1) myCupResult = "ZWYCIĘZCA 🏆";
                else continue;
              } else {
                myCupResult = "Odpadł w: " + round.round;
              }
              break;
            }
          }
        }
      }

      let myCLResult = "Brak kwalifikacji";
      if (clState && clState.active) {
          const playedAnyMatch = clState.history.some(r => r.matches.some(m => String(m.hostId) === String(myTeamId) || String(m.guestId) === String(myTeamId)));
          const wasInParticipants = clState.teams.includes(myTeamId);

          if (playedAnyMatch || wasInParticipants) {
              const finalRound = clState.history.find(r => r.round === "Finał");
              if (finalRound) {
                  const finalMatch = finalRound.matches[0];
                  if (finalMatch && String(finalMatch.winnerId) === String(myTeamId)) {
                      myCLResult = "ZWYCIĘZCA LM 🏆";
                  } else if (finalMatch && (String(finalMatch.hostId) === String(myTeamId) || String(finalMatch.guestId) === String(myTeamId))) {
                      myCLResult = "Finalista";
                  } else {
                      const lastRoundPlayed = [...clState.history].reverse().find(r => r.matches.some(m => String(m.hostId) === String(myTeamId) || String(m.guestId) === String(myTeamId)));
                      myCLResult = lastRoundPlayed ? `Odpadł w: ${lastRoundPlayed.round}` : "Faza Grupowa";
                  }
              } else {
                  const lastRoundPlayed = [...clState.history].reverse().find(r => r.matches.some(m => String(m.hostId) === String(myTeamId) || String(m.guestId) === String(myTeamId)));
                  myCLResult = lastRoundPlayed ? `Odpadł w: ${lastRoundPlayed.round}` : "Uczestnik";
              }
          }
      }

      const myScorers = players.filter(p => p.teamId === myTeamId).sort((a, b) => b.goals - a.goals);
      const topScorerText = (myScorers[0] && myScorers[0].goals > 0) ? `${myScorers[0].name} (${myScorers[0].goals})` : "Brak";

      setSeasonHistory(prev => [...prev, {
        season: seasonNum,
        teamName: myTeamNow.name,
        leagueName: `Liga ${myTeamNow.league} (${myTeamNow.country})`,
        position: myPositionTest,
        points: myTeamNow.points,
        stats: `${myTeamNow.won}-${myTeamNow.drawn}-${myTeamNow.lost}`,
        topScorer: topScorerText,
        cupResult: myCupResult,
        clResult: myCLResult
      }]);

      // --- 3. LIGA MISTRZÓW (Przed awansami!) ---
      const clQuotas = { 'GB-ENG': 6, 'ES': 6, 'IT': 6, 'DE': 5, 'FR': 5, 'PL': 4 };
      let clParticipants = [];

      Object.keys(clQuotas).forEach(countryCode => {
        const topTeams = nextTeams
          .filter(t => t.country === countryCode && t.league === 1)
          .sort((a, b) => b.points - a.points) 
          .slice(0, clQuotas[countryCode]);
        clParticipants = [...clParticipants, ...topTeams];
      });

      if (clParticipants.length === 32) {
          clParticipants.sort((a, b) => ((b.attack + b.defense) / 2) - ((a.attack + a.defense) / 2));
          const pot1 = clParticipants.slice(0, 16);
          const pot2 = clParticipants.slice(16, 32);

          let finalDrawIds = [];
          let success = false;
          let attempts = 0;

          while (!success && attempts < 100) {
              finalDrawIds = [];
              let tempPot2 = [...pot2].sort(() => Math.random() - 0.5); 
              let valid = true;

              for (let i = 0; i < 16; i++) {
                  const teamA = pot1[i];
                  const opponentIdx = tempPot2.findIndex(t => t.country !== teamA.country);

                  if (opponentIdx === -1) {
                      valid = false;
                      break; 
                  }

                  const teamB = tempPot2.splice(opponentIdx, 1)[0];
                  finalDrawIds.push(teamA.id, teamB.id); 
              }

              if (valid) success = true; 
              attempts++;
          }

          if (!success) {
              finalDrawIds = [];
              for (let i = 0; i < 16; i++) {
                  finalDrawIds.push(pot1[i].id, pot2[i].id);
              }
          }

          setClState({
              active: true, phase: 'ro32', teams: finalDrawIds, waiting: [], matches: [], history: []
          });
          logs.push("Liga Mistrzów: 32 zespoły wylosowane! Zabezpieczono bratobójcze pojedynki.");
      } else {
          setClState({ active: false, phase: '', teams: [], matches: [], history: [] });
      }

      // --- 4. AWANSE I SPADKI ---
      const countries = [...new Set(nextTeams.map(t => t.country))];
      let promotions = [];

      countries.forEach(countryCode => {
        const t1 = nextTeams.filter(t => t.country === countryCode && t.league === 1).sort((a, b) => b.points - a.points);
        const t2 = nextTeams.filter(t => t.country === countryCode && t.league === 2).sort((a, b) => b.points - a.points);
        const t3 = nextTeams.filter(t => t.country === countryCode && t.league === 3).sort((a, b) => b.points - a.points);

        if (t1.length >= 2 && t2.length >= 2) {
          const dropCount = Math.min(3, t1.length);
          const dropFromL1 = t1.slice(-dropCount);
          dropFromL1.forEach(t => promotions.push({ id: t.id, toLeague: 2 }));

          const promoteCount = Math.min(2, t2.length);
          const upFromL2 = t2.slice(0, promoteCount);
          upFromL2.forEach(t => promotions.push({ id: t.id, toLeague: 1 }));

          if (t2.length > 2) {
            const playoffL2 = t2.slice(2, 6);
            if (playoffL2.length > 0) {
              const winner = playoffL2[Math.floor(Math.random() * playoffL2.length)];
              promotions.push({ id: winner.id, toLeague: 1 });
              if (countryCode === myTeamNow.country) logs.push(`[${countryCode}] Baraż o L1: ${winner.name} awansuje!`);
            }
          }
        }

        if (t2.length >= 2 && t3.length >= 2) {
          const dropCount = Math.min(3, t2.length);
          const dropFromL2 = t2.slice(-dropCount);
          dropFromL2.forEach(t => promotions.push({ id: t.id, toLeague: 3 }));

          const promoteCount = Math.min(2, t3.length);
          const upFromL3 = t3.slice(0, promoteCount);
          upFromL3.forEach(t => promotions.push({ id: t.id, toLeague: 2 }));

          if (t3.length > 2) {
            const playoffL3 = t3.slice(2, 6);
            if (playoffL3.length > 0) {
              const winner = playoffL3[Math.floor(Math.random() * playoffL3.length)];
              promotions.push({ id: winner.id, toLeague: 2 });
              if (countryCode === myTeamNow.country) logs.push(`[${countryCode}] Baraż o L2: ${winner.name} awansuje!`);
            }
          }
        }
      });

      promotions.forEach(p => {
        const team = nextTeams.find(t => t.id === p.id);
        if (team) team.league = p.toLeague;
      });

      // ====================================================================
      // --- WIELKA GALA PIŁKARSKA (ZŁOTA PIŁKA) ---
      // ====================================================================
      const currentWorldPlayers = [...players];
      
      // 1. Złoty But (Najwięcej Goli)
      const goldenBoot = currentWorldPlayers.sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];
      
      // 2. Złota Rękawica (Najwięcej czystych kont)
      const gks = currentWorldPlayers.filter(p => p.position === 'BR');
      const goldenGlove = gks.sort((a, b) => (b.cleanSheets || 0) - (a.cleanSheets || 0) || (b.form || 0) - (a.form || 0))[0];
      
      // 3. Złota Piłka (Punkty: Gole*4 + Asysty*2 + CzysteKonta*3 + Forma*5 + OVR)
      const ballonDor = currentWorldPlayers.sort((a, b) => {
          const scoreA = (a.goals || 0)*4 + (a.assists || 0)*2 + (a.cleanSheets || 0)*3 + (a.form || 5)*5 + a.skill;
          const scoreB = (b.goals || 0)*4 + (b.assists || 0)*2 + (b.cleanSheets || 0)*3 + (b.form || 5)*5 + b.skill;
          return scoreB - scoreA;
      })[0];

      // Zapisujemy do Sali Chwały
      setHallOfFame(prev => [{
          season: seasonNum,
          ballonDor: { id: ballonDor.id, name: ballonDor.name, club: nextTeams.find(t=>t.id===ballonDor.teamId)?.name || 'Wolny Agent', stat: `${ballonDor.goals||0} Goli, ${ballonDor.assists||0} Asyst`, nation: ballonDor.nation?.code },
          goldenBoot: { id: goldenBoot.id, name: goldenBoot.name, club: nextTeams.find(t=>t.id===goldenBoot.teamId)?.name || 'Wolny Agent', stat: `${goldenBoot.goals||0} Goli`, nation: goldenBoot.nation?.code },
          goldenGlove: { id: goldenGlove.id, name: goldenGlove.name, club: nextTeams.find(t=>t.id===goldenGlove.teamId)?.name || 'Wolny Agent', stat: `${goldenGlove.cleanSheets||0} Czystych kont`, nation: goldenGlove.nation?.code }
      }, ...prev]);

      logs.push(`⭐ ZŁOTA PIŁKA: Wygrywa ${ballonDor.name} z potężnym bonusem do OVR i Wartości!`);
      // ====================================================================
      // --- 5. PRZETWARZANIE GRACZY ---
      let nextPlayers = players.map(p => {
        const newP = { ...p, stats: { ...p.stats } };

        if (newP.loanedFrom) {
          if (newP.teamId === myTeamId) loanReturnsLog.push(`${newP.name} wraca do macierzystego klubu.`);
          if (newP.loanedFrom === myTeamId) loanReturnsLog.push(`${newP.name} wraca do nas z wypożyczenia.`);
          newP.teamId = newP.loanedFrom;
          delete newP.loanedFrom;
          delete newP.buyOption;
          newP.isStarter = false;
        }

       // WRECZANIE NAGRÓD (Bonusy)
        if (newP.id === ballonDor.id) { newP.skill = Math.min(99, newP.skill + 2); newP.potential = Math.max(newP.potential, newP.skill + 1); }
        if (newP.id === goldenBoot.id && newP.stats) newP.stats.shooting = Math.min(99, newP.stats.shooting + 3);
        if (newP.id === goldenGlove.id && newP.stats) newP.stats.defense = Math.min(99, newP.stats.defense + 3);

        newP.age += 1;
        newP.goals = 0;
        newP.assists = 0;
        newP.cleanSheets = 0; // Reset czystych kont
        newP.form = 5;
        newP.yellowCards = 0;
        newP.redCards = 0;
        newP.suspension = 0;

        if (newP.age >= 38 || (newP.age > 34 && Math.random() > 0.75)) {
            newP.name = "Regen " + newP.name.split(" ")[1];
            newP.fullName = "Regen " + (newP.fullName || newP.name);
            newP.age = 16 + Math.floor(Math.random() * 3); 
            newP.skill = Math.max(40, Math.floor(newP.skill * 0.55)); 
            newP.potential = Math.min(99, newP.skill + 15 + Math.floor(Math.random() * 20)); 
            if(newP.stats) newP.stats.pace = Math.min(95, newP.stats.pace + 15); 
            newP.injury = 0;
        } 
        else if (newP.age >= 31) {
            const decline = newP.age >= 34 ? 2 : 1;
            newP.skill -= decline;
            if(newP.stats) {
                newP.stats.pace = Math.max(30, newP.stats.pace - (decline + 1)); 
                newP.stats.physical = Math.max(30, newP.stats.physical - decline);
            }
            newP.potential = newP.skill; 
        }
        else if (newP.age <= 26) {
            if (newP.form >= 8 && newP.skill >= newP.potential - 2) {
                newP.potential = Math.min(99, newP.potential + Math.floor(Math.random() * 2) + 1); 
            }

            if (newP.skill < newP.potential) {
                const gap = newP.potential - newP.skill;
                let growth = 0;
                
                if (gap >= 10) growth = Math.floor(Math.random() * 3) + 1;      
                else if (gap >= 5) growth = Math.floor(Math.random() * 2) + 1;  
                else growth = Math.random() > 0.5 ? 1 : 0;                      

                if (!newP.isStarter) growth = Math.max(0, Math.floor(growth / 2));
                
                newP.skill += growth;
                if (newP.skill > newP.potential) newP.skill = newP.potential;

                if(newP.stats && growth > 0) {
                    const statsKeys = ['pace', 'shooting', 'passing', 'dribbling', 'defense', 'physical'];
                    for(let i=0; i<growth; i++) {
                        const rs = statsKeys[Math.floor(Math.random() * statsKeys.length)];
                        newP.stats[rs] = Math.min(99, newP.stats[rs] + 2);
                    }
                }
            }
        }

        newP.skill = Math.max(30, Math.min(99, newP.skill));
        newP.value = calculatePlayerValue(newP.skill, newP.potential, newP.age);
        
        // Zwiększenie wartości na rynku dla zdobywców nagród!
        if (newP.id === ballonDor.id) newP.value += 20000000;
        if (newP.id === goldenBoot.id) newP.value += 10000000;
        if (newP.id === goldenGlove.id) newP.value += 5000000;

        let newWage = Math.floor(newP.value * 0.008);
        if (newP.skill > 80) newWage = Math.floor(newWage * 1.5);
        if (newWage < 5000) newWage = 5000;
        newP.wage = newWage;
        
        newP.startSeasonSkill = newP.skill;

        return newP;
      });

      // --- 6. PRZETWARZANIE AKADEMII ---
      let nextAcademy = academy.map(jun => {
        const newJun = { ...jun };
        newJun.age += 1;
        if (newJun.skill < newJun.potential) {
             const growth = Math.floor(Math.random() * 3) + 1; 
             newJun.skill += growth;
             if (newJun.skill > newJun.potential) newJun.skill = newJun.potential;
        }
        newJun.value = calculatePlayerValue(newJun.skill, newJun.potential, newJun.age);
        return newJun;
      });

      // --- 7. FINANSE, SPONSORZY I PODSUMOWANIE ---
      let sponsorBonus = 0;
      let sponsorLog = "Sponsor: Kontrakt podstawowy, brak celu.";
      
      // OCENA KONTRAKTU SPONSORSKIEGO
      if (activeSponsor && activeSponsor.bonusAmount > 0) {
          let goalMet = true;
          if (activeSponsor.reqLeaguePos && myPositionTest > activeSponsor.reqLeaguePos) goalMet = false;
          if (activeSponsor.reqCup && (!myCupResult || !myCupResult.includes('ZWYCIĘZCA'))) goalMet = false;

          if (goalMet) {
              sponsorBonus = activeSponsor.bonusAmount;
              sponsorLog = `✅ KONTRAKT SPONSORSKI: Cel zrealizowany! Sponsor wypłaca premię: +${formatMoney(sponsorBonus)}`;
          } else {
              sponsorLog = `❌ KONTRAKT SPONSORSKI: Zawiodłeś. Wymagano miejsca w lidze: ${activeSponsor.reqLeaguePos || '-'}${activeSponsor.reqCup ? ' i Pucharu Polski' : ''}. Premia przepada!`;
          }
      }

      projectedBudget += sponsorBonus; // Dodajemy ewentualną premię do budżetu!
      setBudget(projectedBudget);
      
      let budgetMsg = `
      PODSUMOWANIE FINANSÓW:
      ----------------------
      Miejsce w lidze: ${myPositionTest}
      Nagroda ligowa: ${formatMoney(prizeMoney)}
      Baza od zarządu: ${formatMoney(sponsorMoney)}
      Premia z kontraktu: ${formatMoney(sponsorBonus)}
      Zapłacone pensje: -${formatMoney(totalWageBill)}
      
      DOSTĘPNY BUDŻET NA START: ${formatMoney(projectedBudget)}
      
      ${sponsorLog}
      `;

      // --- 8. RESET PUNKTÓW I ZAPIS STANU ---
      nextTeams.forEach(t => { t.points = 0; t.played = 0; t.won = 0; t.drawn = 0; t.lost = 0; t.goalsFor = 0; t.goalsAgainst = 0; });

      const myNextSquad = nextPlayers.filter(p => p.teamId === myTeamId);
      let myNextStarters = myNextSquad.filter(p => p.isStarter);
      if (myNextStarters.length < 11) {
        const bench = myNextSquad.filter(p => !p.isStarter).slice(0, 11 - myNextStarters.length);
        bench.forEach(p => p.isStarter = true);
      }

      const s1 = generateLeagueSchedule(nextTeams.filter(t => t.country === myTeamNow.country && t.league === 1));
      const s2 = generateLeagueSchedule(nextTeams.filter(t => t.country === myTeamNow.country && t.league === 2));
      const s3 = generateLeagueSchedule(nextTeams.filter(t => t.country === myTeamNow.country && t.league === 3));

      setTeams(nextTeams);
      setPlayers(nextPlayers);
      setAcademy(nextAcademy); 
      setSchedules([s1, s2, s3]);
      setWeek(1);
      setSeasonNum(p => p + 1);
      setLastResults([]);
      setCupTeams(nextTeams.filter(t => t.country === myTeamNow.country).map(t => t.id));
      setCupHistory([]);
      refreshTransferList(nextPlayers, myTeamId);
      setActiveSponsor(null); // Resetujemy sponsora
      setShowSponsorModal(true); // Otwieramy wybór na nowy sezon!

     if (isFired) {
          setMyTeamId(null);
          setBoardConfidence(100);
          setAppMode('JOB_CENTER');
          alert(`❌ ZWOLNIENIE!\n\nZarząd jest wściekły! Oczekiwano awansu lub czołowych miejsc (Cel: Top ${expectedPos}). Zająłeś kompromitujące ${myPositionTest}. miejsce.\n\nTwoja umowa została rozwiązana. Lądujesz na bezrobociu!`);
      } else {
          alert(`Nowy sezon! \n\n${budgetMsg}\n\n${loanReturnsLog.length > 0 ? "Powroty: " + loanReturnsLog.length : ""}\n${logs.join('\n')}`);
      }
    } catch (error) {
      console.error("Błąd podczas nowego sezonu:", error);
      alert("Wystąpił błąd podczas generowania nowego sezonu. Sprawdź konsolę (F12).");
    }
  };

  // --- RENDER ---
 // --- EKRAN STARTOWY (MENU GŁÓWNE Z 3 SLOTAMI) ---
  if (appMode === 'MENU') {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100">
              
              {/* Tło i Logo */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center mb-10">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center font-black text-white text-4xl shadow-[0_0_30px_rgba(147,51,234,0.5)] mb-6 border-b-4 border-white/20">
                      FM
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-lg text-center">
                      POLISH <span className="text-purple-500">MANAGER</span>
                  </h1>
              </div>

              <div className="relative z-10 w-full max-w-2xl space-y-4">
                  <h2 className="text-center text-slate-500 font-bold uppercase tracking-widest mb-6 text-sm">Wybierz Profil Menedżera</h2>
                  
                  {[1, 2, 3].map(slot => {
                      const info = getSaveInfo(slot);
                      return (
                          <div key={slot} className="flex gap-3 h-32 md:h-28">
                              {info.exists ? (
                                  <>
                                      {/* WCZYTAJ ISTNIEJĄCĄ GRĘ */}
                                      <button onClick={() => loadGame(slot)} className="flex-1 bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-purple-500/50 rounded-2xl p-5 flex items-center justify-between transition-all group hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:-translate-y-1 text-left">
                                          <div className="flex flex-col">
                                              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-purple-400 transition-colors">Kariera {slot}</div>
                                              <div className="text-2xl md:text-3xl font-black text-white truncate drop-shadow-md">{info.teamName}</div>
                                              <div className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-4">
                                                  <span className="bg-slate-950/50 px-2 py-0.5 rounded text-white border border-white/5">📅 Sezon {info.season}</span>
                                                  <span className="text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30 shadow-inner">💰 {formatMoney(info.budget)}</span>
                                              </div>
                                          </div>
                                          <div className="text-4xl opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-2 text-purple-400">▶</div>
                                      </button>
                                      
                                      {/* PRZYCISK USUNIĘCIA */}
                                      <button onClick={() => deleteSave(slot)} className="w-16 md:w-20 bg-red-900/20 border border-red-900/50 hover:bg-red-600 hover:border-red-500 rounded-2xl flex items-center justify-center text-2xl md:text-3xl transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] group" title="Skasuj zapis">
                                          <span className="group-hover:scale-125 transition-transform">🗑️</span>
                                      </button>
                                  </>
                              ) : (
                                  /* PUSTY SLOT -> NOWA GRA */
                                  <button onClick={() => handleNewGameClick(slot)} className="flex-1 bg-slate-900/30 border border-dashed border-slate-700 hover:border-purple-500/50 hover:bg-purple-900/10 rounded-2xl p-5 flex items-center justify-center transition-all group hover:shadow-[0_0_20px_rgba(147,51,234,0.1)]">
                                      <div className="text-center">
                                          <div className="text-xl md:text-2xl font-black text-slate-500 group-hover:text-purple-400 transition-colors flex items-center justify-center gap-3">
                                              <span className="text-3xl font-normal">+</span> NOWA KARIERA (SLOT {slot})
                                          </div>
                                      </div>
                                  </button>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }
  // --- NOWY EKRAN WYBORU KRAJU I DRUŻYNY (Po kliknięciu Nowa Kariera) ---
  if (appMode === 'TEAM_SELECT') {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100 animate-fade-in">
              {/* Tło Glassmorphism */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950 pointer-events-none"></div>
              
              <div className="relative z-10 w-full max-w-4xl bg-slate-900/60 backdrop-blur-xl p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl">
                  
                  <h2 className="text-3xl md:text-5xl font-black text-center italic tracking-tight mb-10 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                      {teams.length === 0 ? "WYBIERZ KRAJ" : "WYBIERZ SWÓJ KLUB"}
                  </h2>

                  {teams.length === 0 ? (
                      /* KROK 1: WYBÓR KRAJU */
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                          {[
                              { code: 'GB-ENG', name: 'Anglia' }, 
                              { code: 'ES', name: 'Hiszpania' }, 
                              { code: 'IT', name: 'Włochy' }, 
                              { code: 'DE', name: 'Niemcy' }, 
                              { code: 'FR', name: 'Francja' }, 
                              { code: 'PL', name: 'Polska' }
                          ].map(c => (
                              <button 
                                  key={c.code} 
                                  onClick={() => handleCountrySelect(c.code)} 
                                  className="bg-slate-800/50 hover:bg-gradient-to-br hover:from-purple-600 hover:to-indigo-600 border border-white/10 hover:border-purple-400 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] group"
                              >
                                  <div className="text-4xl shadow-lg rounded-full group-hover:scale-110 transition-transform"><FlagIcon code={c.code} size="xl" /></div>
                                  <span className="font-black tracking-widest uppercase text-sm md:text-base group-hover:text-white text-slate-300">{c.name}</span>
                              </button>
                          ))}
                      </div>
                  ) : (
                      /* KROK 2: WYBÓR DRUŻYNY */
                      <div className="space-y-8 animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
                              {teams.map(t => (
                                  <button 
                                      key={t.id} 
                                      onClick={() => {
                                          setMyTeamId(t.id);
                                          // Tego brakowało! Generujemy zawodników na sprzedaż przy starcie nowej gry
                                          if (typeof refreshTransferList === 'function') {
                                              refreshTransferList(players, t.id); 
                                          }
                                          setAppMode('GAME'); 
                                      }} 
                                      className="bg-slate-800/40 hover:bg-gradient-to-r hover:from-emerald-600 hover:to-teal-600 border border-white/5 hover:border-emerald-400 rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(16,185,129,0.3)] group"
                                  >
                                      <div className="text-lg font-black truncate w-full text-center group-hover:text-white text-slate-200">{t.name}</div>
                                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-950/50 group-hover:bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                                          Liga {t.league}
                                      </div>
                                  </button>
                              ))}
                          </div>
                          <div className="text-center pt-2">
                              <button onClick={() => setTeams([])} className="text-xs text-slate-500 hover:text-white uppercase tracking-widest font-black transition-colors hover:underline underline-offset-4">
                                  ← Wróć do wyboru państwa
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }
  if (appMode === 'COUNTRY_SELECT') return <CountrySelectionScreen onSelect={handleCountrySelect} onBack={() => setAppMode('MENU')} />;
  if (appMode === 'EXIT') return <div className="h-screen bg-slate-950 flex items-center justify-center text-white flex-col"><h1 className="text-4xl mb-4">Dzięki za grę!</h1><button onClick={() => setAppMode('MENU')} className="text-purple-400">Wróć</button></div>;
  if (appMode === 'SELECT') {
      // Filtrujemy drużyny po wybranym kodzie kraju
      const filteredTeams = teams.filter(t => t.country === userCountryCode);
      
      // Jeśli lista pusta - wyświetl błąd zamiast pustego ekranu
      if (filteredTeams.length === 0) {
          return (
              <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                  <h2 className="text-xl text-red-500 font-bold">Błąd: Brak klubów do wyświetlenia.</h2>
                  <p>Wybrany kraj: {userCountryCode || "Brak"}</p>
                  <p>Liczba wszystkich wczytanych drużyn: {teams.length}</p>
                  <button onClick={() => setAppMode('MENU')} className="mt-4 bg-white text-black px-4 py-2 rounded">Wróć do Menu</button>
              </div>
          );
      }

      return <TeamSelectionScreen teams={filteredTeams} onSelect={handleTeamSelect} onBack={() => setAppMode('COUNTRY_SELECT')} />;
  }
  if (isSimulating && simulationData) return <MatchSimulationView matchData={simulationData} timer={simulationTime} teamA={simulationData.teamA} teamB={simulationData.teamB} onFinish={finishWeekLogic} />;
// 1. Znajdź swój zespół (bezpiecznie)
// --- NOWA LOGIKA: TYLKO RYWALE (BEZ OVR) ---
 // --- POPRAWIONA LOGIKA: ZAWSZE POKAZUJ RYWALA ---
// --- POPRAWIONE WYSZUKIWANIE RYWALA NA GŁÓWNĄ STRONĘ ---
// =========================================================================
  // --- NOWA LOGIKA: POBIERANIE RYWALA PROSTO Z TERMINARZA ---
  // =========================================================================
  
  // 1. Ustalenie naszej drużyny
  const myTeam = teams.find(t => String(t.id) === String(myTeamId));
  const mySquad = players.filter(p => String(p.teamId) === String(myTeamId));

  let nextOpponent = null;
  let nextMatchText = "PRZERWA";

  // 2. Pobieranie danych z terminarza (JEŚLI MAMY DRUŻYNĘ)
  if (myTeam && schedules.length > 0) {
      const leagueIndex = (myTeam.league || 1) - 1;
      const currentLeagueSchedule = schedules[leagueIndex];

      // Sprawdzenie czy terminarz dla tej ligi istnieje
      if (currentLeagueSchedule) {
          // Pobieramy mecze dla AKTUALNEGO tygodnia (indeks tablicy = week - 1)
          // week = 1 -> index 0
          const currentRoundMatches = currentLeagueSchedule[week - 1];

          if (currentRoundMatches) {
              // Szukamy meczu, w którym gra MY_TEAM_ID
              const match = currentRoundMatches.find(m => 
                  String(m.home) === String(myTeamId) || String(m.away) === String(myTeamId)
              );

              if (match) {
                  // Jeśli znaleziono mecz, ustalamy kto jest rywalem
                  const isHome = String(match.home) === String(myTeamId);
                  const opponentId = isHome ? match.away : match.home;

                  // Pobieramy pełne dane rywala z bazy drużyn
                  nextOpponent = teams.find(t => String(t.id) === String(opponentId));
                  
                  if (nextOpponent) {
                      nextMatchText = isHome ? "DOM" : "WYJAZD";
                  } else {
                      console.log("Błąd: Znaleziono ID rywala, ale brak go w bazie teams:", opponentId);
                  }
              } else {
                  // Mamy kolejkę, ale nie ma w niej naszego meczu (pauza?)
                  nextMatchText = "PAUZA";
              }
          } else {
              if (week > 34) nextMatchText = "KONIEC SEZONU";
          }
      }
  }

  // =========================================================================

  const renderView = () => {
      switch(currentView) {
          case 'table': return <MultiLeagueTable teams={teams} activeTab={activeLeagueTab} setTab={setActiveLeagueTab} myTeam={myTeam} />;
          case 'cup': return <CupView history={cupHistory} myTeamId={myTeamId} />;
          case 'cl': return <ChampionsLeagueView clState={clState} myTeamId={myTeamId} />;
          case 'world': return <WorldTablesView teams={teams} />;
          case 'schedule': return <ScheduleView schedules={schedules} teams={teams} myTeamId={myTeamId} currentWeek={week} />;
          case 'scorers': return <TopScorers players={players} teams={teams} />;
          case 'manager': return <ManagerProfileView managerData={managerData} setManagerData={setManagerData} />;
          case 'infrastructure': return <InfrastructureView infrastructure={infrastructure} setInfrastructure={setInfrastructure} budget={budget} setBudget={setBudget} />;
          // PRZEKAZUJEMY sellOwnPlayer DO SQUAD VISUALS, A POTEM DO MODALA
          case 'squad': return <SquadVisuals players={mySquad} openPlayerModal={setSelectedPlayerForDetails} swapSourceId={swapSourceId} onSwap={handleSwapRequest} onBuyOption={triggerBuyOption} onSell={sellOwnPlayer} myFormation={myFormation} setMyFormation={setMyFormation} />;
          case 'history': return <HistoryView history={seasonHistory} />;
          case 'hof': return <HallOfFameView hallOfFame={hallOfFame} />;
          case 'academy': return <AcademyView academy={academy} budget={budget} onScout={sendScout} onPromote={promoteJunior} onFire={fireJunior} />;
          case 'transfers': return <TransferMarketView transferList={transferList} budget={budget} onTransfer={executeTransfer} managerData={managerData} />;
          default: return <Dashboard myTeam={myTeam} week={week} onPlayGame={startWeekSimulation} lastResults={lastResults} maxWeeks={34} onNewSeason={startNewSeason} notifications={notifications} nextMatchText={nextMatchText} nextOpponent={nextOpponent} activeSponsor={activeSponsor} />;
      }
  };
    return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans text-slate-100 selection:bg-purple-500/30">
      
      {/* Tło pod całą aplikacją (subtelny gradient) */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>

      
      {selectedPlayerForDetails && <PlayerDetailModal player={selectedPlayerForDetails} onClose={() => setSelectedPlayerForDetails(null)} onSwap={() => handleSwapRequest(selectedPlayerForDetails.id)} swapSourceId={swapSourceId} onSell={() => sellOwnPlayer(selectedPlayerForDetails)} onBuyOption={() => triggerBuyOption(selectedPlayerForDetails)} managerData={managerData} />}
      {/* NOWOŚĆ: EKRAN WYDARZENIA FABULARNEGO */}
      {activeEvent && <StoryEventModal event={activeEvent} onResolve={handleResolveEvent} />}
        {/* NOWOŚĆ: EKRAN WYBORU SPONSORA */}
      {showSponsorModal && myTeam && (
          <SponsorSelectionModal 
              team={myTeam} 
              onSelect={(sponsor) => {
                  setActiveSponsor(sponsor);
                  setBudget(b => b + sponsor.upfrontAmount);
                  setShowSponsorModal(false);
              }} 
          />
      )}
      
      {/* PASEK BOCZNY (Nowoczesny, węższy, rozwijany) */}
      <aside className="relative w-72 flex flex-col border-r border-white/5 bg-slate-950/50 backdrop-blur-xl z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        
        {/* Logo */}
        <div className="p-6 h-24 flex items-center gap-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-[0_0_15px_rgba(147,51,234,0.5)] border-b-2 border-white/20">
                FM
            </div>
            <div>
                <h1 className="font-black text-lg leading-none tracking-tight">POLISH<br/><span className="text-purple-400">MANAGER</span></h1>
            </div>
        </div>

        {/* POGRUPOWANA NAWIGACJA (AKORDEON) - POPRAWIONA WYSOKOŚĆ */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-12">
            
            {/* GRUPA 1: KLUB */}
            <div>
                <button onClick={() => setExpandedGroup('Klub')} className="w-full flex justify-between items-center text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-2 hover:text-white transition">
                    <span>Twój Klub</span>
                    <span>{expandedGroup === 'Klub' ? '▼' : '▶'}</span>
                </button>
                <div className={`space-y-1.5 overflow-hidden transition-all duration-500 ${expandedGroup === 'Klub' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <MenuButton icon="🏠" label="Centrala" active={currentView==='dashboard'} onClick={()=>setCurrentView('dashboard')} />
                    <MenuButton icon="🛡️" label="Skład i Taktyka" active={currentView==='squad'} onClick={()=>setCurrentView('squad')} />
                    <MenuButton icon="🎓" label="Akademia" active={currentView==='academy'} onClick={()=>setCurrentView('academy')} />
                    <MenuButton icon="🏗️" label="Infrastruktura" active={currentView==='infrastructure'} onClick={()=>setCurrentView('infrastructure')} />
                </div>
            </div>

            {/* GRUPA 2: ROZGRYWKI */}
            <div>
                <button onClick={() => setExpandedGroup('Rozgrywki')} className="w-full flex justify-between items-center text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-2 hover:text-white transition">
                    <span>Rozgrywki</span>
                    <span>{expandedGroup === 'Rozgrywki' ? '▼' : '▶'}</span>
                </button>
                <div className={`space-y-1.5 overflow-hidden transition-all duration-500 ${expandedGroup === 'Rozgrywki' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <MenuButton icon="📅" label="Terminarz" active={currentView==='schedule'} onClick={()=>setCurrentView('schedule')} />
                    <MenuButton icon="🏆" label="Liga Krajowa" active={currentView==='table'} onClick={()=>setCurrentView('table')} />
                    <MenuButton icon="🇵🇱" label="Puchar Polski" active={currentView==='cup'} onClick={()=>setCurrentView('cup')} />
                    <MenuButton icon="⭐" label="Liga Mistrzów" active={currentView==='cl'} onClick={()=>setCurrentView('cl')} />
                    <MenuButton icon="🌍" label="Ligi Świata" active={currentView==='world'} onClick={()=>setCurrentView('world')} />
                </div>
            </div>

            {/* GRUPA 3: BIURO */}
            <div>
                <button onClick={() => setExpandedGroup('Biuro')} className="w-full flex justify-between items-center text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-2 hover:text-white transition">
                    <span>Biuro Menadżera</span>
                    <span>{expandedGroup === 'Biuro' ? '▼' : '▶'}</span>
                </button>
                <div className={`space-y-1.5 overflow-hidden transition-all duration-500 ${expandedGroup === 'Biuro' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <MenuButton icon="💸" label="Rynek Transferowy" active={currentView==='transfers'} onClick={()=>setCurrentView('transfers')} />
                    <MenuButton icon="⚽" label="Top Strzelcy" active={currentView==='scorers'} onClick={()=>setCurrentView('scorers')} />
                    <MenuButton icon="👔" label="Profil Menedżera" active={currentView==='manager'} onClick={()=>setCurrentView('manager')} />
                    <MenuButton icon="🌟" label="Sala Chwały" active={currentView==='hof'} onClick={()=>setCurrentView('hof')} />
                    <MenuButton icon="📜" label="Historia Kariery" active={currentView==='history'} onClick={()=>setCurrentView('history')} />
                </div>
            </div>

        </nav>

        {/* STOPKA PASKA BOCZNEGO (Zapis / Wyjście) */}
        <div className="p-4 bg-white/5 border-t border-white/5 flex flex-col gap-2">
            <button onClick={saveGame} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition border border-slate-700 hover:border-emerald-500">
                💾 Zapisz Grę
            </button>
            <div className="flex gap-2">
                <button onClick={() => setIsMuted(!isMuted)} className="flex-1 flex justify-center items-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg border border-slate-700">
                    {isMuted ? "🔇" : "🔊"}
                </button>
                <button onClick={() => setAppMode('MENU')} className="flex-1 flex justify-center items-center py-2 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition font-bold text-sm border border-slate-700 hover:border-red-500">
                    Wyjdź
                </button>
            </div>
        </div>
      </aside>

      {/* GŁÓWNA ZAWARTOŚĆ APLIKACJI */}
      <main className="relative flex-1 flex flex-col h-screen overflow-hidden z-10">
        
        {/* NAGŁÓWEK GLASSMORPHISM */}
        <header className="h-24 bg-slate-900/60 backdrop-blur-xl border-b border-white/10 flex justify-between px-10 items-center shadow-lg sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <div className="hidden md:flex w-14 h-14 bg-slate-800 rounded-full items-center justify-center border-2 border-slate-700 shadow-inner text-3xl">
                    <FlagIcon code={myTeam?.country} size="xl" />
                </div>
                <div>
                    <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-sm">
                        {myTeam ? myTeam.name : "Twój Klub"}
                    </h2>
                    <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mt-1 bg-purple-900/30 w-fit px-2 py-0.5 rounded border border-purple-500/30">
                        LIGA: {myTeam ? myTeam.league : "-"}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* WSKAŹNIK MENEDŻERA */}
                <div className="flex flex-col items-end cursor-pointer group" onClick={() => setCurrentView('manager')}>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1 flex items-center gap-2 group-hover:text-purple-400 transition-colors">
                        Menedżer LVL {managerData.level} 
                        {managerData.sp > 0 && <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[8px] animate-pulse shadow-[0_0_10px_rgba(147,51,234,0.8)]">SP: {managerData.sp}</span>}
                    </span>
                    <div className="w-32 h-2.5 bg-slate-900 rounded-full overflow-hidden shadow-inner border border-slate-700">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000" style={{ width: `${(managerData.xp / (managerData.level * 500)) * 100}%` }}></div>
                    </div>
                </div>
                {/* WSKAŹNIK POPARCIA ZARZĄDU */}
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Poparcie Zarządu</span>
                    <div className="w-32 h-2.5 bg-slate-900 rounded-full overflow-hidden shadow-inner border border-slate-700 mt-1" title="Jeśli spadnie do 0%, zostaniesz zwolniony!">
                        <div className={`h-full transition-all duration-1000 ${boardConfidence > 60 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : boardConfidence > 30 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`} style={{ width: `${boardConfidence}%` }}></div>
                    </div>
                </div>
                {/* Wskaźnik Budżetu */}
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Budżet Klubu</span>
                    <div className="bg-slate-900/80 px-4 py-1.5 rounded-xl border border-yellow-500/30 text-yellow-400 font-mono text-lg font-bold shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                        {formatMoney(budget)}
                    </div>
                </div>
            </div>
                {/* Wskaźnik Tygodnia */}
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Kalendarz</span>
                    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-5 py-2 rounded-xl border border-indigo-500/50 text-white font-bold text-xl shadow-lg">
                        Tydzień {week}
                    </div>
                </div>
        </header>

        {/* KONTENER WIDOKÓW */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative z-0">
            <div className="max-w-7xl mx-auto pb-20">
                {renderView()}
            </div>
        </div>
      </main>
    </div>
  );
}

// --- WIDOKI ---

const MainMenu = ({ onNewGame, onLoadGame, onExit }) => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        <div className="relative z-10 text-center animate-fade-in-up">
            <h1 className="text-7xl font-black text-white mb-2">FOOTBALL <span className="text-purple-400">MANAGER</span></h1>
            <div className="flex flex-col gap-4 w-80 mx-auto mt-10">
                <button onClick={onNewGame} className="bg-white text-slate-900 font-black py-4 rounded-full hover:scale-105 transition">NOWA GRA</button>
                <button onClick={onLoadGame} className="bg-slate-800 text-white font-bold py-4 rounded-full border border-slate-700 hover:bg-slate-700 transition">WCZYTAJ GRĘ</button>
                <button onClick={onExit} className="text-slate-500 font-bold py-4 hover:text-white transition">WYJDŹ</button>
            </div>
        </div>
    </div>
);

const CountrySelectionScreen = ({ onSelect, onBack }) => {
    const countries = [{ code: 'PL', name: 'Polska' }, { code: 'GB-ENG', name: 'Anglia' }, { code: 'ES', name: 'Hiszpania' }, {code: 'FR', name:'Francja'} ,{ code: 'IT', name: 'Włochy' }, {code: 'DE', name: 'Niemcy'}];
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
             <button onClick={onBack} className="absolute top-8 left-8 text-slate-400 hover:text-white font-bold flex items-center gap-2 transition-colors">
                <span className="text-xl">←</span> Wróć do Menu
             </button>
             
             <div className="text-center mb-12 animate-fade-in-up">
                 <h2 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">WYBIERZ LIGĘ</h2>
                 <p className="text-slate-400 text-lg">Gdzie chcesz rozpocząć swoją karierę?</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                 {countries.map(c => (
                     <button 
                        key={c.code} 
                        onClick={() => onSelect(c.code)} 
                        className="group relative bg-slate-800 overflow-hidden rounded-3xl border border-slate-700 hover:border-purple-500 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:-translate-y-2 aspect-video flex flex-col items-center justify-center"
                     >
                         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                         <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-500">
                             <FlagIcon code={c.code === 'IT' ? 'IT' : c.code} size="xl" />
                         </div>
                         <h3 className="relative z-10 text-3xl font-black text-white mt-4 uppercase tracking-wider group-hover:text-purple-300 transition-colors">
                             {c.name}
                         </h3>
                     </button>
                 ))}
             </div>
        </div>
    );
};

const TeamSelectionScreen = ({ teams, onSelect, onBack }) => {
    // Grupujemy zespoły według lig
    const league1 = teams.filter(t => t.league === 1);
    const league2 = teams.filter(t => t.league === 2);
    const league3 = teams.filter(t => t.league === 3);

    const renderLeagueSection = (title, teamsList, colorClass) => (
        <div className="mb-8 animate-fade-in-up">
            <h3 className={`text-2xl font-black mb-4 uppercase tracking-wider border-b-2 ${colorClass} pb-2 inline-block text-white`}>
                {title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamsList.map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => onSelect(t.id)} 
                        className="relative overflow-hidden group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-white transition-all duration-300 rounded-xl p-4 text-left shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-6xl">🛡️</span>
                        </div>
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-lg text-white group-hover:text-purple-300 transition-colors">{t.name}</div>
                                <div className="text-xs text-slate-400 mt-1">Siła: <span className="text-white font-mono">{Math.round((t.attack+t.defense)/2)}</span></div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center font-bold text-slate-500 group-hover:text-white group-hover:bg-purple-600 transition-all">
                                {Math.round((t.attack+t.defense)/2)}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col p-8 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            <div className="max-w-7xl mx-auto w-full">
                {/* Header z przyciskiem powrotu */}
                <div className="flex items-center justify-between mb-12">
                    <button 
                        onClick={onBack} 
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full font-bold transition shadow-lg border border-slate-700 hover:border-white"
                    >
                        <span>←</span> Zmień Kraj
                    </button>
                    <div className="text-right">
                        <h1 className="text-4xl md:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-tighter">
                            WYBIERZ KLUB
                        </h1>
                        <p className="text-slate-400 text-sm md:text-lg">Twoja kariera zaczyna się tutaj</p>
                    </div>
                </div>

                <div className="pb-20">
                    {league1.length > 0 && renderLeagueSection("Liga 1", league1, "border-purple-500 text-purple-400")}
                    {league2.length > 0 && renderLeagueSection("Liga 2", league2, "border-emerald-500 text-emerald-400")}
                    {league3.length > 0 && renderLeagueSection("Liga 3", league3, "border-blue-500 text-blue-400")}
                </div>
            </div>
        </div>
    );
};

// --- NOWA, PRZEPIĘKNA SYMULACJA MECZU (Z PAUZĄ NA KONIEC) ---
const MatchSimulationView = ({ matchData, timer, teamA, teamB, onFinish }) => {
    const evs = matchData.events.filter(e => e.minute <= timer);
    const scoreA = evs.filter(e => e.team === 'home' && (!e.type || e.type === 'goal')).length;
    const scoreB = evs.filter(e => e.team === 'away' && (!e.type || e.type === 'goal')).length;
    
    const scrollRef = useRef(null);
    useEffect(() => { 
        if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [evs]);

    const progress = (timer / 90) * 100;
    const isMatchOver = timer >= 90;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 font-sans text-white overflow-hidden">
            
            {/* TŁO - STADION Z BLUREM */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0565c6a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-slate-900/80"></div>

            {/* SCOREBOARD (GÓRNA BELKA) */}
            <div className="relative z-10 w-full pt-10 pb-6 bg-gradient-to-b from-black/90 to-transparent shadow-2xl">
                <div className="max-w-5xl mx-auto flex items-center justify-between px-6 md:px-12">
                    
                    {/* GOSPODARZ */}
                    <div className="flex-1 text-right flex flex-col items-end">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-4 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.5)] mb-3 overflow-hidden">
                            <FlagIcon code={teamA.country} size="xl" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white drop-shadow-md">
                            {teamA.name}
                        </h2>
                    </div>

                    {/* WYNIK I CZAS */}
                    <div className="mx-8 flex flex-col items-center">
                        <div className="flex items-center gap-6 bg-slate-900/80 backdrop-blur-xl px-10 py-3 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                            <span className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{scoreA}</span>
                            <span className="text-3xl text-slate-500 font-light">:</span>
                            <span className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{scoreB}</span>
                        </div>
                        <div className="mt-4 flex items-center gap-3 bg-slate-950/80 px-4 py-1.5 rounded-full border border-white/5">
                            {!isMatchOver && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>}
                            <span className={`font-mono text-2xl font-black tracking-widest ${isMatchOver ? 'text-slate-400' : 'text-yellow-400'}`}>
                                {isMatchOver ? "KONIEC" : `${timer < 10 ? `0${timer}` : timer}'`}
                            </span>
                        </div>
                    </div>

                    {/* GOŚĆ */}
                    <div className="flex-1 text-left flex flex-col items-start">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-4 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.5)] mb-3 overflow-hidden">
                            <FlagIcon code={teamB.country} size="xl" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white drop-shadow-md">
                            {teamB.name}
                        </h2>
                    </div>
                </div>
            </div>

            {/* OBSZAR ZDARZEŃ (FEED) Z EFEKTEM FADE-OUT NA GÓRZE */}
            <div className="relative z-10 flex-1 overflow-hidden flex flex-col justify-end">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-900/90 to-transparent z-20 pointer-events-none"></div>
                
                <div ref={scrollRef} className="w-full max-w-4xl mx-auto px-4 space-y-4 overflow-y-auto custom-scrollbar scroll-smooth h-full pb-10 pt-20">
                    {evs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <div className="text-6xl mb-4 animate-spin-slow">⚽</div>
                            <div className="text-2xl font-light uppercase tracking-widest">Oczekiwanie na pierwszy gwizdek...</div>
                        </div>
                    ) : (
                        evs.map((ev, i) => (
                            <div key={i} className={`flex w-full animate-slide-up ${ev.team === 'home' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`relative max-w-[80%] md:max-w-[60%] p-5 rounded-3xl border backdrop-blur-xl shadow-2xl flex items-center gap-5 transition-transform hover:scale-105 group
                                    ${ev.team === 'home' 
                                        ? 'bg-gradient-to-r from-blue-900/80 to-slate-900/90 border-blue-500/40 text-left pr-10' 
                                        : 'bg-gradient-to-l from-red-900/80 to-slate-900/90 border-red-500/40 text-right flex-row-reverse pl-10'
                                    }`}
                                >
                                    {/* MINUTA */}
                                    <div className="flex flex-col items-center justify-center min-w-[50px] bg-slate-950/50 p-2 rounded-xl border border-white/5 shadow-inner">
                                        <div className="font-mono text-2xl font-black text-yellow-400 leading-none">{ev.minute}'</div>
                                    </div>

                                    {/* TREŚĆ WYDARZENIA */}
                                    <div className="flex-1">
                                        {ev.type === 'goal' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-yellow-400 font-black uppercase tracking-widest text-sm">
                                                    <span>⚽ GOL! {ev.isPenalty && <span className="text-[10px] text-yellow-200 bg-yellow-900/50 px-2 py-0.5 rounded border border-yellow-500/50 ml-2">RZUT KARNY</span>}</span>
                                                </div>
                                                <div className="text-2xl md:text-3xl font-black text-white leading-tight mt-1">{ev.scorer?.name}</div>
                                                {ev.assist && <div className="text-sm text-slate-300 mt-1 opacity-90">Asysta: <span className="font-bold">{ev.assist.name}</span></div>}
                                            </>
                                        ) : ev.type === 'missed_penalty' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-red-500 font-black uppercase tracking-widest text-sm">
                                                    <span>❌ NIETRAFIONY KARNY!</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-300 leading-tight line-through decoration-red-500 mt-1">{ev.taker?.name}</div>
                                                <div className="text-xs text-slate-400 mt-1">Bramkarz wyczuł intencje strzelca.</div>
                                            </>
                                        ) : ev.type === 'injury' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-red-400 font-black uppercase tracking-widest text-sm">
                                                    <span>🚑 KONTUZJA!</span>
                                                </div>
                                                <div className="text-xl font-bold text-white leading-tight mt-1">{ev.player?.name}</div>
                                                <div className="text-xs text-red-300 mt-1">Służby medyczne znoszą gracza na noszach ({ev.weeks} tyg. przerwy).</div>
                                            </>
                                        ) : ev.type === 'sub' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-blue-400 font-black uppercase tracking-widest text-sm">
                                                    <span>🔄 ZMIANA W SKŁADZIE</span>
                                                </div>
                                                <div className="text-base font-black text-emerald-400 mt-1">Wchodzi: <span className="text-white">{ev.playerIn?.name}</span></div>
                                                <div className="text-xs font-bold text-slate-400">Schodzi: {ev.playerOut?.name}</div>
                                            </>
                                        ) : ev.type === 'yellow' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-yellow-500 font-black uppercase tracking-widest text-sm">
                                                    <span>🟨 ŻÓŁTA KARTKA</span>
                                                </div>
                                                <div className="text-xl font-bold text-white leading-tight mt-1">{ev.player?.name}</div>
                                            </>
                                        ) : ev.type === 'red' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-red-600 font-black uppercase tracking-widest text-sm animate-pulse">
                                                    <span>🟥 CZERWONA KARTKA!</span>
                                                </div>
                                                <div className="text-xl font-black text-white leading-tight mt-1">{ev.player?.name}</div>
                                                <div className="text-xs text-red-300 mt-1 uppercase tracking-widest">{ev.secondYellow ? "Druga żółta kartka!" : "Brutalny faul!"}</div>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* PANEL PO ZAKOŃCZENIU MECZU ALBO PASEK POSTĘPU */}
            {isMatchOver ? (
                <div className="relative z-50 bg-slate-950/95 backdrop-blur-3xl border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] p-6 md:p-10 flex flex-col items-center animate-slide-up">
                    <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-widest italic">Podsumowanie Spotkania</h3>
                    
                    <div className="flex justify-center items-center gap-8 md:gap-16 mb-8 text-center text-sm font-bold text-slate-400 w-full max-w-2xl">
                        <div className="flex-1"><span className="block text-3xl font-black text-blue-400 mb-1">{matchData.chancesA}</span>Sytuacje</div>
                        <div className="flex-1"><span className="block text-3xl font-black text-emerald-400 mb-1">{matchData.savesA}</span>Obrony</div>
                        <div className="text-slate-700 text-5xl font-light opacity-50">|</div>
                        <div className="flex-1"><span className="block text-3xl font-black text-emerald-400 mb-1">{matchData.savesB}</span>Obrony</div>
                        <div className="flex-1"><span className="block text-3xl font-black text-red-400 mb-1">{matchData.chancesB}</span>Sytuacje</div>
                    </div>

                    <button 
                        onClick={onFinish} 
                        className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-16 py-5 rounded-full font-black text-xl tracking-widest uppercase transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] flex items-center gap-4 group"
                    >
                        <span>Przejdź Dalej</span>
                        <span className="group-hover:translate-x-2 transition-transform">➔</span>
                    </button>
                </div>
            ) : (
                <>
                    {/* DOLNY PASEK POSTĘPU (W TRAKCIE MECZU) */}
                    <div className="relative z-20 h-2.5 bg-slate-800 w-full shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 transition-all duration-[80ms] ease-linear shadow-[0_0_20px_rgba(168,85,247,0.8)]"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    {/* STÓPKA */}
                    <div className="relative z-10 bg-black py-2.5 text-center text-xs text-slate-500 uppercase tracking-widest font-bold">
                        Symulacja na żywo • Polish Manager
                    </div>
                </>
            )}
        </div>
    );
};
const Dashboard = ({ myTeam, week, onPlayGame, lastResults, maxWeeks, onNewSeason, notifications, nextMatchText, nextOpponent, activeSponsor }) => {
    const isOver = week > maxWeeks;
    const myLast = lastResults.find(r => r.host === myTeam.name || r.guest === myTeam.name);
    
    // --- LOGIKA ZAMIANY STRON (GOSPODARZ Z LEWEJ, GOŚĆ Z PRAWEJ) ---
    // Jeśli gramy mecz WYJAZDOWY, to Rywal jest Gospodarzem (Lewa), a my Gościem (Prawa).
    // Jeśli gramy u siebie (DOM) lub nie ma rywala (Pauza), my jesteśmy z lewej.
    
    const isUserAway = nextMatchText === "WYJAZD";
    
    // Ustalanie kto jest po lewej (Gospodarz), a kto po prawej (Gość)
    const leftTeam = isUserAway ? nextOpponent : myTeam;
    const rightTeam = isUserAway ? myTeam : nextOpponent;
    
    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Główny Baner Meczu */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-700 group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-slate-900 to-purple-950 opacity-95"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                
                <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    
                    {/* LEWA STRONA (GOSPODARZ) */}
                    <div className="flex flex-col items-center w-1/3">
                        {leftTeam ? (
                            <>
                                <div className="transform hover:scale-110 transition duration-500 relative">
                                    <div className={`text-8xl shadow-2xl rounded-full overflow-hidden border-4 ${leftTeam.id === myTeam?.id ? 'border-purple-500 shadow-purple-500/50' : 'border-blue-500'}`}>
                                        <FlagIcon code={leftTeam.country} size="xl" />
                                    </div>
                                    {leftTeam.id === myTeam?.id && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">Twój Klub</div>}
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-white mt-4 text-center tracking-tight drop-shadow-lg">
                                    {leftTeam.name}
                                </h2>
                                <div className="mt-1 text-sm text-blue-400 font-bold tracking-widest uppercase">GOSPODARZ</div>
                            </>
                        ) : (
                            <div className="opacity-50 flex flex-col items-center">
                                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-600 text-4xl">?</div>
                            </div>
                        )}
                    </div>

                    {/* ŚRODEK (VS i PRZYCISK) */}
                    <div className="flex flex-col items-center text-center w-1/3 z-20">
                        <div className="text-xs font-bold text-blue-300 tracking-[0.2em] uppercase mb-4 bg-slate-900/50 px-4 py-1 rounded-full border border-blue-500/30">
                            {isOver ? "KONIEC SEZONU" : `KOLEJKA ${week}`}
                        </div>
                        
                        <div className="text-5xl md:text-7xl font-black text-white/10 italic absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
                            VS
                        </div>

                        <button 
                            onClick={isOver ? onNewSeason : onPlayGame} 
                            className="group relative bg-white hover:bg-blue-50 text-slate-900 px-10 py-4 rounded-full font-black text-lg transition-all transform hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] active:scale-95 flex items-center gap-3 border-4 border-transparent hover:border-blue-200"
                        >
                            <span>{isOver ? "🔄" : "⚽"}</span>
                            <span>{isOver ? "NOWY SEZON" : "GRAJ MECZ"}</span>
                        </button>
                    </div>

                    {/* PRAWA STRONA (GOŚĆ) */}
                    <div className="flex flex-col items-center w-1/3">
                        {rightTeam ? (
                            <>
                                <div className="transform hover:scale-110 transition duration-500 relative">
                                    <div className={`text-8xl shadow-2xl rounded-full overflow-hidden border-4 ${rightTeam.id === myTeam?.id ? 'border-purple-500 shadow-purple-500/50' : 'border-red-600'}`}>
                                        <FlagIcon code={rightTeam.country} size="xl" />
                                    </div>
                                    {rightTeam.id === myTeam?.id && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">Twój Klub</div>}
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-white mt-4 text-center tracking-tight drop-shadow-lg">
                                    {rightTeam.name}
                                </h2>
                                <div className="mt-1 text-sm text-red-400 font-bold tracking-widest uppercase">GOŚĆ</div>
                            </>
                        ) : (
                            <div className="opacity-50 flex flex-col items-center">
                                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-600 text-4xl">?</div>
                                <h2 className="text-xl font-bold text-slate-400 mt-4">Brak Rywala</h2>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Powiadomienia */}
            {notifications.length > 0 && (
                <div className="bg-slate-800/90 backdrop-blur rounded-xl border-l-4 border-yellow-500 p-4 shadow-lg">
                    <h3 className="font-bold text-white mb-2 text-sm uppercase tracking-wide">📢 Centrum Wiadomości</h3>
                    <div className="space-y-2">
                        {notifications.slice(0, 3).map((n, i) => (
                            <div key={i} className="flex justify-between text-sm border-b border-slate-700/50 pb-1 last:border-0">
                                <span className="text-slate-300">{n.text}</span>
                                <span className={n.value > 0 ? 'text-emerald-400 font-mono' : 'text-red-400 font-mono'}>
                                    {n.value !== 0 && formatMoney(n.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AKTYWNY SPONSOR */}
            {activeSponsor && (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-indigo-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-[0_0_20px_rgba(79,70,229,0.15)]">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl">🤝</div>
                        <div>
                            <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Główny Sponsor: {activeSponsor.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Cel na sezon: <span className="text-white font-bold">{activeSponsor.reqLeaguePos ? `Top ${activeSponsor.reqLeaguePos} w Lidze` : 'Brak'} {activeSponsor.reqCup && ' + Wygrana w Pucharze'}</span></p>
                        </div>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Potencjalna Premia</div>
                        <div className="text-xl font-mono font-black text-emerald-400">{formatMoney(activeSponsor.bonusAmount)}</div>
                    </div>
                </div>
            )}

            {/* Ostatni Mecz i Wyniki */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Karta Ostatniego Meczu */}
                <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl flex flex-col">
                    <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-white uppercase text-sm tracking-wider">Ostatni Występ</h3>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest border border-slate-600 px-2 py-1 rounded">Raport</span>
                    </div>
                    {/* AKTYWNY SPONSOR */}
            {activeSponsor && (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-indigo-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-[0_0_20px_rgba(79,70,229,0.15)] mb-6">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl">🤝</div>
                        <div>
                            <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Główny Sponsor: {activeSponsor.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Cel na sezon: <span className="text-white font-bold">{activeSponsor.reqLeaguePos ? `Top ${activeSponsor.reqLeaguePos} w Lidze` : 'Brak'} {activeSponsor.reqCup && ' + Wygrana w Pucharze'}</span></p>
                        </div>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Potencjalna Premia</div>
                        <div className="text-xl font-mono font-black text-emerald-400">{formatMoney(activeSponsor.bonusAmount)}</div>
                    </div>
                </div>
            )}
                    
                    <div className="p-6 flex-1 flex flex-col justify-center">
                        {myLast ? (
                <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                    
                    {/* WIELKI NAGŁÓWEK Z WYNIKIEM */}
                    <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-6 border-b border-white/10 shadow-lg">
                        <div className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-black mb-4">RAPORT MECZOWY</div>
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex-1 text-right text-xl md:text-2xl font-black text-white truncate">{myLast.host}</div>
                            <div className="px-5 py-2 bg-slate-950 rounded-xl border border-slate-700 shadow-inner flex items-center gap-3">
                                <span className="text-3xl md:text-4xl font-black text-purple-400">{myLast.scoreA}</span>
                                <span className="text-xl text-slate-600">:</span>
                                <span className="text-3xl md:text-4xl font-black text-purple-400">{myLast.scoreB}</span>
                            </div>
                            <div className="flex-1 text-left text-xl md:text-2xl font-black text-white truncate">{myLast.guest}</div>
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                        
                        {/* OŚ CZASU (ZDARZENIA) */}
                        <div className="space-y-3 p-4 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                            {myLast.events.length === 0 ? (
                                <div className="text-center text-slate-500 text-sm italic py-4 font-bold">Brak kluczowych zdarzeń w tym meczu.</div>
                            ) : (
                                myLast.events.map((ev, i) => (
                                    <div key={i} className={`flex w-full ${ev.team === 'home' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-bold shadow-md transition-transform hover:scale-105 ${ev.team === 'home' ? 'bg-blue-900/20 border-blue-500/30 text-blue-100 flex-row' : 'bg-red-900/20 border-red-500/30 text-red-100 flex-row-reverse text-right'}`}>
                                            <span className="font-mono text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-white/10 text-xs">{ev.minute}'</span>
                                            {(!ev.type || ev.type === 'goal') ? (
                                                <span className="text-white text-base drop-shadow-md">⚽ {ev.scorer?.name}</span>
                                            ) : ev.type === 'injury' ? (
                                                <span className="text-red-400">🚑 {ev.player?.name} ({ev.weeks} tyg.)</span>
                                            ) : ev.type === 'sub' ? ( // NOWOŚĆ: ZMIANA!
                                                <span className="text-blue-300 text-xs uppercase tracking-widest flex items-center gap-1">
                                                    🔄 <span><span className="text-emerald-400">IN:</span> {ev.playerIn?.name}</span> <span className="text-slate-500">|</span> <span><span className="text-red-400">OUT:</span> {ev.playerOut?.name}</span>
                                                </span>
                                            ) : ev.type === 'yellow' ? (
                                                <span className="text-yellow-400 drop-shadow-md">🟨 {ev.player?.name}</span>
                                            ) : ev.type === 'red' ? (
                                                <span className="text-red-500 drop-shadow-md">🟥 {ev.player?.name} {ev.secondYellow && "(2x🟨)"}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* GRUBE, CZYTELNE PASKI STATYSTYK */}
                        {(() => {
                            const renderStatBar = (label, valA, valB, colorA, colorB) => {
                                const total = (valA + valB) || 1;
                                return (
                                    <div className="mb-4">
                                        <div className="flex justify-between items-end mb-1.5 px-1">
                                            <span className="text-lg font-black text-white">{valA}</span>
                                            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">{label}</span>
                                            <span className="text-lg font-black text-white">{valB}</span>
                                        </div>
                                        <div className="flex h-3 w-full gap-1 shadow-inner">
                                            <div className="flex-1 bg-slate-800 rounded-l-full overflow-hidden flex justify-end">
                                                <div className={`h-full ${colorA} transition-all duration-1000`} style={{ width: `${(valA / total) * 100}%` }}></div>
                                            </div>
                                            <div className="flex-1 bg-slate-800 rounded-r-full overflow-hidden">
                                                <div className={`h-full ${colorB} transition-all duration-1000`} style={{ width: `${(valB / total) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            };

                            return (
                                <div className="bg-slate-950/30 p-5 rounded-2xl border border-white/5">
                                    {renderStatBar("Sytuacje", myLast.chancesA || 0, myLast.chancesB || 0, "bg-blue-500", "bg-red-500")}
                                    {renderStatBar("Udane Obrony", myLast.savesA || 0, myLast.savesB || 0, "bg-emerald-500", "bg-orange-500")}
                                    {renderStatBar("Faule", myLast.foulsA || 0, myLast.foulsB || 0, "bg-slate-500", "bg-slate-500")}
                                    
                                    <div className="grid grid-cols-2 gap-x-8 mt-6 pt-6 border-t border-slate-800">
                                        <div>
                                            {renderStatBar("Rz. Rożne", myLast.cornersA || 0, myLast.cornersB || 0, "bg-indigo-400", "bg-pink-400")}
                                        </div>
                                        <div>
                                            {renderStatBar("Rz. Wolne", myLast.freeKicksA || 0, myLast.freeKicksB || 0, "bg-purple-400", "bg-cyan-400")}
                                        </div>
                                    </div>
                                    
                                    {/* KARNE WIDOCZNE ZAWSZE! */}
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    {renderStatBar("Rzuty Karne", myLast.penaltiesA || 0, myLast.penaltiesB || 0, "bg-yellow-400", "bg-yellow-400")}
                                </div>
                            </div>
                        );
                    })()}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-900/40 rounded-3xl border border-white/5 p-10">
                    <span className="text-4xl mb-4 opacity-50">⚽</span>
                    <p className="font-bold">Rozegraj mecz, aby zobaczyć raport.</p>
                </div>
            )}
                    </div>
                </div>

                {/* Lista Wyników */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                    <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-700">
                        <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider">Wyniki Ligowe</h3>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {lastResults.map((r, i) => (
                            <div key={i} className="bg-slate-700/30 rounded p-3 flex justify-between items-center text-xs border border-slate-700/50">
                                <span className="w-1/3 text-right font-bold text-slate-300 truncate">{r.host}</span>
                                <span className="bg-slate-900 text-white px-2 py-1 rounded font-mono">{r.scoreA}:{r.scoreB}</span>
                                <span className="w-1/3 text-left font-bold text-slate-300 truncate">{r.guest}</span>
                            </div>
                        ))}
                        {lastResults.length === 0 && <div className="p-4 text-center text-slate-500 text-xs">Jeszcze nie grano.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
const TransferMarketView = ({ transferList, budget, onTransfer, managerData }) => {
    // Obliczanie zniżki na podstawie skilla menedżera
    const discount = (managerData?.skills?.negotiator || 0) * 0.05;

    return (
        <div className="space-y-8 animate-fade-in">
            
            {/* NAGŁÓWEK GLASSMORPHISM */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">RYNEK TRANSFEROWY</h2>
                    <p className="text-slate-400 mt-1">Znajdź wzmocnienia dla swojego zespołu</p>
                </div>
                <div className="relative z-10 flex flex-col items-start md:items-end">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Dostępne Środki</div>
                    <div className="text-2xl font-mono font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)] bg-slate-950/50 px-4 py-2 rounded-xl border border-yellow-500/20">
                        {formatMoney(budget)}
                    </div>
                </div>
            </div>

            {/* SIATKA KART ZAWODNIKÓW */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {transferList.map(p => (
                    <div key={p.id} className="group relative bg-slate-900/60 backdrop-blur-md border border-white/5 hover:border-purple-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_10px_40px_rgba(147,51,234,0.15)] hover:-translate-y-1 flex flex-col">
                        
                        {/* GÓRA KARTY (Info o graczu) */}
                        <div className="p-6 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent flex gap-4 items-center">
                            <div className="relative">
                                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 flex items-center justify-center font-black text-white text-2xl shadow-inner group-hover:scale-105 transition-transform">
                                    {p.skill}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-1 border border-slate-700 shadow-lg">
                                    <FlagIcon code={p.nation.code} size="md" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-lg text-white truncate leading-tight group-hover:text-purple-300 transition-colors" title={p.fullName || p.name}>
                                    {p.fullName || p.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    {p.position} • {p.age} LAT
                                </div>
                            </div>
                        </div>
                        
                        {/* ŚRODEK KARTY (Statystyki) */}
                        <div className="p-5 flex-1 flex flex-col justify-center gap-4 bg-slate-950/30">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Potencjał</span>
                                <span className="text-sm font-black text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded-lg border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                    {p.potential}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Wartość</span>
                                
                                {/* DYNAMICZNA ZNIŻKA MENEDŻERA */}
                                <div className="flex flex-col items-end">
                                    {discount > 0 && <span className="text-[9px] text-red-400 line-through">{formatMoney(p.value)}</span>}
                                    <span className={`text-sm font-mono font-bold ${discount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                                        {formatMoney(Math.floor(p.value * (1 - discount)))}
                                    </span>
                                </div>
                                
                            </div>
                        </div>

                        {/* DÓŁ KARTY (Akcje transferowe) */}
                        <div className="p-3 bg-slate-950/80 flex gap-2 border-t border-white/5">
                            <button onClick={() => onTransfer(p, 'buy')} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                KUP
                            </button>
                            <button onClick={() => onTransfer(p, 'loan_opt')} className="flex-1 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30 hover:border-purple-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                WYPOŻYCZ
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HistoryView = ({ history }) => (
    <div className="space-y-8 animate-fade-in">
        {/* NAGŁÓWEK */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.5)] z-10 border-2 border-white/20">📜</div>
            <div className="z-10 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">HISTORIA KARIERY</h2>
                <p className="text-amber-300 font-medium mt-1">Twoje dziedzictwo menadżerskie z biegiem lat</p>
            </div>
        </div>

        {history.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/5 text-slate-500 text-lg">
                Zakończ swój pierwszy sezon, aby zobaczyć tutaj wpis.
            </div>
        ) : (
            <div className="grid gap-6">
                {history.map((h, i) => (
                    <div key={i} className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/10 p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl hover:border-amber-500/30 transition-all hover:-translate-y-1">
                        
                        {/* Lewa strona: Sezon i Klub */}
                        <div className="flex items-center gap-6 md:w-1/3">
                            <div className="bg-gradient-to-b from-slate-800 to-slate-950 p-4 rounded-2xl border border-white/10 text-center min-w-[90px] shadow-inner">
                                <div className="text-[10px] text-amber-500 uppercase font-black tracking-widest">Sezon</div>
                                <div className="text-4xl font-black text-white">{h.season}</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white italic tracking-tight">{h.teamName}</h3>
                                <div className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1 bg-slate-950/50 inline-block px-2 py-1 rounded border border-white/5">
                                    {h.leagueName}
                                </div>
                            </div>
                        </div>

                        {/* Środek: Statystyki ligowe */}
                        <div className="flex gap-8 text-center border-y md:border-y-0 md:border-x border-white/10 py-4 md:py-0 px-8 w-full md:w-auto justify-center">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Miejsce</div>
                                <div className={`text-4xl font-black drop-shadow-md ${h.position === 1 ? 'text-yellow-400' : h.position <= 3 ? 'text-emerald-400' : 'text-white'}`}>
                                    {h.position}
                                    {h.position === 1 && <span className="text-lg ml-1">🏆</span>}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Punkty</div>
                                <div className="text-4xl font-black text-white">{h.points}</div>
                            </div>
                        </div>

                        {/* Prawa strona: Puchary i Strzelec */}
                        <div className="md:w-1/3 flex flex-col gap-3 w-full">
                            <div className="flex justify-between items-center bg-slate-950/50 px-4 py-2.5 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Puchar Polski</span>
                                <span className={`text-xs font-bold ${h.cupResult.includes('ZWYCIĘZCA') ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]' : 'text-white'}`}>{h.cupResult || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-950/50 px-4 py-2.5 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Liga Mistrzów</span>
                                <span className={`text-xs font-bold ${h.clResult.includes('ZWYCIĘZCA') ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]' : 'text-white'}`}>{h.clResult || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-gradient-to-r from-amber-900/20 to-slate-950/50 px-4 py-2.5 rounded-xl border border-amber-500/20">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Top Strzelec</span>
                                <span className="text-xs font-bold text-amber-100 flex items-center gap-1">👑 {h.topScorer}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);
const AcademyView = ({ academy, budget, onScout, onPromote, onFire }) => (
    <div className="space-y-8 animate-fade-in">
        
        {/* PANEL WYSYŁANIA SKAUTÓW */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tight flex items-center gap-3">
                        <span>🌍</span> CENTRUM SKAUTINGU
                    </h2>
                    <p className="text-slate-400 mt-1">Wysyłaj łowców talentów w różne zakątki świata</p>
                </div>
                <div className="flex flex-col items-start md:items-end">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Budżet Operacyjny</div>
                    <div className="text-xl font-mono text-yellow-400 font-bold bg-slate-950/50 px-4 py-2 rounded-xl border border-yellow-500/20">
                        {formatMoney(budget)}
                    </div>
                </div>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {SCOUTING_REGIONS.map(r => (
                    <div key={r.id} className="group bg-slate-800/60 backdrop-blur border border-white/5 hover:border-blue-500/50 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(59,130,246,0.15)] flex flex-col justify-between">
                        <div>
                            <h3 className="font-black text-white text-lg leading-tight group-hover:text-blue-300 transition-colors">{r.name}</h3>
                            <div className="text-xs text-slate-400 mt-2 font-mono font-bold bg-slate-900/50 inline-block px-2 py-1 rounded">
                                Koszt: {formatMoney(r.cost)}
                            </div>
                        </div>
                        <button onClick={()=>onScout(r)} className="mt-5 w-full py-3 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-500/30 transition-all">
                            Wyślij Skauta
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* TABELA RAPORTÓW JUNIORÓW */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent flex items-center justify-between">
                <h3 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2">
                    <span>🎓</span> Raporty z Akademii
                </h3>
                <span className="text-xs text-slate-500 font-bold bg-slate-950 px-3 py-1 rounded-full border border-white/5">
                    {academy.length} ZAWODNIKÓW
                </span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-300 min-w-[700px]">
                    <thead className="bg-slate-950/50 text-[10px] uppercase tracking-widest text-slate-500">
                        <tr>
                            <th className="p-5 font-bold">Imię i Nazwisko</th>
                            <th className="p-5 text-center font-bold">Wiek</th>
                            <th className="p-5 text-center font-bold">Obecny OVR</th>
                            <th className="p-5 text-center font-bold">Potencjał</th>
                            <th className="p-5 text-right font-bold">Decyzja</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {academy.length === 0 ? (
                            <tr><td colSpan="5" className="p-10 text-center text-slate-500 italic">Brak juniorów w akademii. Wyślij skautów w świat!</td></tr>
                        ) : academy.map(j => (
                            <tr key={j.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-5 flex gap-4 items-center">
                                    <div className="w-8 h-8 rounded-full overflow-hidden shadow border border-slate-700 flex items-center justify-center bg-slate-800">
                                        <FlagIcon code={j.nation.code} size="xl" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-base group-hover:text-blue-300 transition-colors">{j.name}</div>
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{j.position}</div>
                                    </div>
                                </td>
                                <td className="p-5 text-center font-mono font-medium">{j.age}</td>
                                <td className="p-5 text-center font-black text-white text-xl drop-shadow-md">{j.skill}</td>
                                <td className="p-5 text-center">
                                    <span className="font-black text-emerald-400 bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)] inline-block min-w-[40px]">
                                        {j.potential}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        {j.age >= 16 ? (
                                            <button onClick={()=>onPromote(j.id)} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-transform hover:scale-105 shadow-lg">
                                                Kontrakt
                                            </button>
                                        ) : (
                                            <div className="bg-slate-800 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-not-allowed border border-slate-700">
                                                Za młody
                                            </div>
                                        )}
                                        <button onClick={()=>onFire(j.id)} className="bg-red-900/30 hover:bg-red-600 border border-red-800 hover:border-red-500 px-3 py-2 rounded-xl text-red-400 hover:text-white text-xs font-black transition-all shadow-lg" title="Zwolnij z akademii">
                                            ✕
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const SquadVisuals = ({ players, openPlayerModal, swapSourceId, onSwap, onBuyOption, onSell, myFormation, setMyFormation }) => { 
    const [viewMode, setViewMode] = useState('pitch'); 
    const starters = players.filter(p => p.isStarter); 
    const bench = players.filter(p => !p.isStarter).sort((a,b) => b.skill - a.skill); 
    const statsPlayers = [...starters, ...bench].sort((a,b) => b.goals - a.goals); 
    
    const handlePitchCardClick = (e, p) => { e.stopPropagation(); if (swapSourceId) onSwap(p.id); else openPlayerModal(p); };

    return (
        <div className="h-full flex flex-col gap-6 animate-fade-in">
            
            {/* --- NOWOŚĆ: PANEL TAKTYKI I ZGRANIA --- */}
            {(() => {
                const req = FORMATIONS[myFormation];
                const counts = { BR: 0, OBR: 0, POM: 0, NAP: 0 };
                starters.forEach(p => { if (counts[p.position] !== undefined) counts[p.position]++; });
                
                let mismatches = Math.abs(req.BR - counts.BR) + Math.abs(req.OBR - counts.OBR) + 
                                 Math.abs(req.POM - counts.POM) + Math.abs(req.NAP - counts.NAP);
                const misplaced = mismatches / 2;
                const penalty = misplaced * 5; // Wyświetlana kara

                return (
                    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col xl:flex-row items-center justify-between gap-6">
                        
                        {/* Wybór Formacji */}
                        <div>
                            <h3 className="text-xl font-black italic text-white mb-3 uppercase tracking-widest drop-shadow-md">Taktyka i Zgranie</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(FORMATIONS).map(form => (
                                    <button 
                                        key={form}
                                        onClick={() => setMyFormation(form)}
                                        className={`px-4 py-2.5 rounded-xl font-black text-xs md:text-sm tracking-widest transition-all border ${myFormation === form ? 'bg-gradient-to-br from-purple-600 to-indigo-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)] scale-105' : 'bg-slate-950/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                    >
                                        {form}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Wskaźnik Zgrania i Wymagań */}
                        <div className="flex-1 w-full max-w-lg bg-slate-950 p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                            {penalty > 0 && <div className="absolute inset-0 bg-red-900/10 animate-pulse pointer-events-none"></div>}
                            
                            <div className="flex justify-between items-center mb-3 relative z-10">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wymagania formacji:</span>
                                <span className={`text-sm md:text-base font-black px-3 py-1 rounded-lg border shadow-inner ${penalty === 0 ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400' : 'bg-red-900/40 border-red-500/50 text-red-400'}`}>
                                    {penalty === 0 ? '✅ 100% ZGRANIA' : `⚠️ KARA DO OVR: -${penalty}`}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 text-center text-[10px] md:text-xs font-black relative z-10">
                                <div className={`p-2.5 rounded-xl border transition-colors ${counts.BR === req.BR ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : 'bg-red-900/20 border-red-500/30 text-red-300'}`}>BR: {counts.BR}/{req.BR}</div>
                                <div className={`p-2.5 rounded-xl border transition-colors ${counts.OBR === req.OBR ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : 'bg-red-900/20 border-red-500/30 text-red-300'}`}>OBR: {counts.OBR}/{req.OBR}</div>
                                <div className={`p-2.5 rounded-xl border transition-colors ${counts.POM === req.POM ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : 'bg-red-900/20 border-red-500/30 text-red-300'}`}>POM: {counts.POM}/{req.POM}</div>
                                <div className={`p-2.5 rounded-xl border transition-colors ${counts.NAP === req.NAP ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : 'bg-red-900/20 border-red-500/30 text-red-300'}`}>NAP: {counts.NAP}/{req.NAP}</div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* PRZEŁĄCZNIK WIDOKÓW (Pigułka Glassmorphism) */}
            <div className="flex bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl w-fit border border-white/10 shadow-xl">
                <button onClick={() => setViewMode('pitch')} className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${viewMode === 'pitch' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                    🏟️ Ustawienie
                </button>
                <button onClick={() => setViewMode('stats')} className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${viewMode === 'stats' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                    📊 Statystyki
                </button>
            </div>

            {viewMode === 'pitch' ? (
                <div className="flex flex-col xl:flex-row gap-8">
                    
                    {/* BOISKO */}
                    <div className="flex-1 relative bg-gradient-to-b from-emerald-900 to-green-950 rounded-3xl border border-white/10 shadow-2xl min-h-[750px] flex flex-col overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-30 mix-blend-overlay"></div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 border-4 border-white/20 rounded-b-full pointer-events-none"></div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48 border-4 border-white/20 rounded-t-full pointer-events-none"></div>
                        <div className="absolute top-1/2 left-0 w-full h-1 border-t-4 border-white/20 pointer-events-none"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-white/20 rounded-full pointer-events-none"></div>

                        <div className="relative z-10 flex-1 grid grid-rows-4 py-8 px-4">
                            <div className="flex justify-center gap-16 items-end pb-4">{starters.filter(p => p.position === 'NAP').map(p => <FUTCard key={p.id} player={p} isSelected={swapSourceId === p.id} onClick={(e) => handlePitchCardClick(e, p)} />)}</div>
                            <div className="flex justify-center gap-6 items-center">{starters.filter(p => p.position === 'POM').map(p => <FUTCard key={p.id} player={p} isSelected={swapSourceId === p.id} onClick={(e) => handlePitchCardClick(e, p)} />)}</div>
                            <div className="flex justify-center gap-6 items-start pt-4">{starters.filter(p => p.position === 'OBR').map(p => <FUTCard key={p.id} player={p} isSelected={swapSourceId === p.id} onClick={(e) => handlePitchCardClick(e, p)} />)}</div>
                            <div className="flex justify-center items-end pb-2">{starters.filter(p => p.position === 'BR').map(p => <FUTCard key={p.id} player={p} isSelected={swapSourceId === p.id} onClick={(e) => handlePitchCardClick(e, p)} />)}</div>
                        </div>
                    </div>
                
                    {/* ŁAWKA REZERWOWYCH */}
                    <div className="w-full xl:w-96 flex flex-col gap-4">
                        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 h-full shadow-2xl flex flex-col">
                            <h3 className="text-white font-black mb-4 text-xs uppercase tracking-widest border-b border-white/5 pb-4 flex items-center gap-3">
                                <span>🪑</span> Ławka Rezerwowych
                            </h3>
                            <div className="grid grid-cols-1 gap-3 overflow-y-auto custom-scrollbar pr-2 h-[660px]">
                                {bench.map(p => (
                                    <div key={p.id} onClick={(e) => handlePitchCardClick(e, p)} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer border backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${swapSourceId === p.id ? 'bg-purple-900/50 border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.4)]' : 'bg-slate-800/40 border-white/5 hover:border-white/20'}`}>
                                        <div className={`w-12 h-12 flex flex-col items-center justify-center rounded-xl font-black text-lg shadow-inner ${p.skill >= 75 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' : p.skill >= 65 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900' : 'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100'}`}>
                                            {p.skill}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
                                                {p.name} 
                                                {p.injury > 0 && <span className="text-[10px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded border border-red-500/50 animate-pulse">🚑</span>}
                                            </div>
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{p.position}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    {/* WIDOK STATYSTYK ZAWODNIKÓW */}
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm text-slate-300 min-w-[900px]">
                            <thead className="bg-slate-950/50 uppercase text-[10px] font-black tracking-widest text-slate-500 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5">Zawodnik</th>
                                    <th className="px-4 py-5 text-center">Gole</th>
                                    <th className="px-4 py-5 text-center">Asysty</th>
                                    <th className="px-3 py-5 text-center">🟨</th>
                                    <th className="px-3 py-5 text-center">🟥</th>
                                    <th className="px-4 py-5 text-center">Forma</th>
                                    <th className="px-4 py-5 text-center">OVR</th>
                                    <th className="px-6 py-5 text-right">Wartość</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {statsPlayers.map(p => (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => openPlayerModal(p)}>
                                        <td className="px-6 py-4">
                                            <span className={`text-[9px] font-black tracking-widest px-3 py-1.5 rounded-lg border shadow-sm ${p.isStarter ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/50 text-slate-500 border-white/5'}`}>
                                                {p.isStarter ? '1. SKŁAD' : 'ŁAWKA'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full overflow-hidden shadow border border-slate-700 flex items-center justify-center bg-slate-800 group-hover:scale-110 transition-transform">
                                                <FlagIcon code={p.nation?.code} size="xl" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-base flex items-center gap-2 group-hover:text-purple-300 transition-colors">
                                                    {p.name} 
                                                    {p.loanedFrom && <span className="text-[8px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">WYP</span>}
                                                    {p.injury > 0 && <span className="text-[10px] bg-red-900/80 text-red-200 px-2 py-0.5 rounded border border-red-500/50 ml-1 flex items-center gap-1 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]">🚑 {p.injury} tyg.</span>}
                                                    {p.suspension > 0 && <span className="text-[10px] bg-yellow-600 text-yellow-100 px-2 py-0.5 rounded border border-yellow-400 ml-1 flex items-center gap-1 animate-pulse shadow-[0_0_10px_rgba(202,138,4,0.5)]">🚫 {p.suspension} mecz</span>}
                                                </div>
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{p.position} &bull; {p.age} LAT</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center font-black text-white text-lg">{p.goals}</td>
                                        <td className="px-4 py-4 text-center text-slate-400 text-lg">{p.assists}</td>
                                        <td className="px-3 py-4 text-center text-yellow-400 font-bold">{p.yellowCards || 0}</td>
                                        <td className="px-3 py-4 text-center text-red-500 font-bold">{p.redCards || 0}</td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center font-bold">
                                                <span className={`text-base ${p.form >= 8 ? 'text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]' : p.form <= 3 ? 'text-blue-400' : 'text-slate-300'}`}>
                                                    {Math.floor(p.form)}
                                                </span>
                                                <span className="ml-1.5 text-sm">{p.form >= 8 ? '🔥' : p.form <= 3 ? '❄️' : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-xl font-black text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">{p.skill}</span>
                                                {p.startSeasonSkill !== undefined && p.skill !== p.startSeasonSkill && (
                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${p.skill > p.startSeasonSkill ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' : 'bg-red-900/30 text-red-400 border-red-500/30'}`}>
                                                        {p.skill > p.startSeasonSkill ? `+${p.skill - p.startSeasonSkill}` : p.skill - p.startSeasonSkill}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-bold text-emerald-400 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-white/5">
                                                {formatMoney(p.value)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    ); 
};

const FUTCard = ({ player, onClick, isSelected }) => {
  if (!player) return null;
  
  let bgClass = "bg-gradient-to-br from-amber-800 via-amber-600 to-amber-900 border-amber-500/50"; 
  let textClass = "text-amber-100";
  let glowClass = "shadow-[0_0_15px_rgba(217,119,6,0.3)]";

  if (player.skill >= 75) { 
      bgClass = "bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-700 border-yellow-300/60"; 
      textClass = "text-yellow-950"; 
      glowClass = "shadow-[0_0_20px_rgba(234,179,8,0.5)]";
  } else if (player.skill >= 65) { 
      bgClass = "bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 border-white/60"; 
      textClass = "text-slate-900"; 
      glowClass = "shadow-[0_0_15px_rgba(255,255,255,0.4)]";
  }
  
  return (
      <div onClick={onClick} className={`relative w-24 h-36 cursor-pointer transition-all duration-300 group z-50 pointer-events-auto rounded-t-lg rounded-b-[1.5rem] ${isSelected ? 'scale-110 ring-4 ring-purple-500 shadow-purple-500/80' : `hover:scale-110 hover:z-50 ${glowClass}`}`}>
        
        {/* ZNACZNIK KONTUZJI (Prawy górny róg) */}
        {player.injury > 0 && (
            <div className="absolute -top-3 -right-3 z-[60] bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-slate-900 shadow-lg animate-pulse flex items-center gap-1">
                🚑 {player.injury}
            </div>
        )}

        {/* ZNACZNIK ZAWIESZENIA (Lewy górny róg) */}
        {player.suspension > 0 && (
            <div className="absolute -top-3 -left-3 z-[60] bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded-full border-2 border-slate-900 shadow-lg animate-pulse flex items-center gap-1">
                🚫 {player.suspension}
            </div>
        )}
        
        {/* ZNACZNIK MORALI - FOCH (Lewy dolny róg) */}
        {player.morale !== undefined && player.morale <= 40 && (
            <div className="absolute -bottom-3 -left-3 z-[60] bg-red-900 text-white text-sm px-1.5 py-0.5 rounded-full border-2 border-red-500 shadow-[0_0_10px_red] animate-bounce" title="Gracz jest wściekły! Otrzymuje karę do OVR i niedługo odejdzie z klubu!">
                😡
            </div>
        )}

        <div className={`absolute inset-0 ${bgClass} rounded-t-lg rounded-b-[1.5rem] shadow-xl border overflow-hidden`}>
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent opacity-50 transform -skew-y-6"></div>
        </div>

        <div className={`relative z-10 h-full flex flex-col p-1.5 ${textClass}`}>
            <div className="flex justify-between items-start leading-none relative">
                <div className="flex flex-col relative z-10">
                    <span className="text-xl font-black tracking-tighter drop-shadow-md">{player.skill}</span>
                    <span className="text-[9px] font-bold uppercase mt-0.5 opacity-90">{player.position}</span>
                    {player.form >= 8 && <span className="absolute -right-4 top-0 text-[10px] animate-bounce drop-shadow-md" title="Wysoka forma!">🔥</span>}
                    {player.form <= 3 && <span className="absolute -right-4 top-0 text-[10px] drop-shadow-md" title="Niska forma">❄️</span>}
                </div>
                <div className="flex flex-col items-end z-10"><span className="text-xl shadow-sm"><FlagIcon code={player.nation?.code} size="sm" /></span></div>
            </div>
            
            <div className="flex-1 flex items-center justify-center -my-1 z-10">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.3)] bg-black/20 flex items-center justify-center backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 opacity-70"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
                </div>
            </div>
            
            <div className="text-center mb-1 z-10">
                <p className="text-[10px] font-black uppercase truncate tracking-tight drop-shadow-md">{player.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-x-1 text-[7.5px] font-bold text-center leading-tight opacity-90 border-t border-black/15 pt-1 z-10">
                <span>{player.stats.pace} PAC</span>
                <span>{player.stats.dribbling} DRI</span>
                <span>{player.stats.shooting} SHO</span>
                <span>{player.stats.defense} DEF</span>
            </div>
        </div>
      </div>
  );
};

// --- MODAL DLA ZAWODNIKA: TUTAJ DODAŁEM PRZYCISK SPRZEDAŻY I INFO O PENSJI ---
const PlayerDetailModal = ({ player, onClose, onSwap, swapSourceId, onSell, onBuyOption, managerData }) => {
    const sellPercent = 75 + ((managerData?.skills?.negotiator || 0) * 5);
    if (!player) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="w-full md:w-1/3 bg-gradient-to-br from-slate-800 to-slate-900 p-8 flex items-center justify-center relative"><div className="scale-150 transform"><FUTCard player={player} onClick={() => {}} /></div></div>
                <div className="flex-1 p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl">✕</button>
                    <div className="flex justify-between items-end mb-6 border-b border-slate-700 pb-4">
                        <div>
                           <h2 className="text-3xl font-black italic uppercase tracking-tighter">{player.fullName || player.name}</h2>
<div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
    <span className="flex items-center gap-1"><FlagIcon code={player.nation?.code} /> {player.nation?.name}</span>
    <span>•</span><span>Lat: {player.age}</span>
    
    {/* NOWE: NUMERYCZNY WSKAŹNIK FORMY */}
    <span>•</span>
    <span className={`font-bold flex items-center gap-1 ${player.form >= 8 ? 'text-orange-500' : player.form <= 3 ? 'text-blue-400' : 'text-slate-300'}`}>
        Forma: {Math.floor(player.form)}/10 {player.form >= 8 ? '🔥' : player.form <= 3 ? '❄️' : ''}
    </span>

    {player.wage && <span className="text-yellow-500">• Pensja: {formatMoney(player.wage)}</span>}
    
    {/* NOWE: WSKAŹNIK MORALI */}
    <span className={`font-black flex items-center gap-1 px-2 py-0.5 rounded border shadow-inner ${
        (player.morale === undefined ? 100 : player.morale) > 70 ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : 
        (player.morale === undefined ? 100 : player.morale) > 40 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50' : 
        'bg-red-900/50 text-red-400 border-red-500/80 animate-pulse'
    }`}>
        • Morale: {player.morale === undefined ? 100 : player.morale}% 
        {(player.morale !== undefined && player.morale <= 40) && '😡 (KARA)'}
    </span>

    {/* NOWE: INFO O KONTUZJI */}
    {/* NOWE: INFO O KONTUZJI */}
    {player.injury > 0 && (
        <span className="text-red-400 font-bold bg-red-900/30 px-2 py-1 rounded border border-red-500/50 animate-pulse">
            🚑 KONTUZJA: {player.injury} tyg.
        </span>
    )}
</div>
                        </div>
                        <div className="text-right">
                            {/* NOWE: BLOK OVR i PROGRESU */}
                            <div className="flex justify-end items-end gap-2 mb-3 pb-3 border-b border-slate-700/50">
                                <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-widest">OVR</div>
                                <div className="text-5xl font-black text-white leading-none">{player.skill}</div>
                                {player.startSeasonSkill !== undefined && player.skill !== player.startSeasonSkill && (
                                    <div className={`text-2xl font-black mb-0.5 ${player.skill > player.startSeasonSkill ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {player.skill > player.startSeasonSkill ? `+${player.skill - player.startSeasonSkill}` : player.skill - player.startSeasonSkill}
                                    </div>
                                )}
                            </div>
                            <div className="text-sm uppercase text-slate-500 font-bold mb-1">Wartość</div>
                            <div className="text-2xl font-black text-emerald-400">{formatMoney(player.value)}</div>
                            <div className="text-xs text-slate-500 mt-1">Potencjał: {player.potential}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8"><StatBar label="Tempo (PAC)" value={player.stats.pace} /><StatBar label="Strzały (SHO)" value={player.stats.shooting} /><StatBar label="Podania (PAS)" value={player.stats.passing} /><StatBar label="Drybling (DRI)" value={player.stats.dribbling} /><StatBar label="Obrona (DEF)" value={player.stats.defense} /><StatBar label="Fizyczność (PHY)" value={player.stats.physical} /></div>
                    
                    <div className="flex gap-4">
                        <button onClick={() => onSwap(player.id)} className={`flex-1 py-4 rounded-xl font-bold text-lg transition shadow-lg ${swapSourceId === player.id ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}>{swapSourceId === null ? "ZMIANY W SKŁADZIE" : swapSourceId === player.id ? "ANULUJ" : "ZAMIEŃ"}</button>
                        
                        {/* LOGIKA ZARZĄDZANIA KONTRAKTEM (Sprzedaż lub Wykup) */}
                        {!player.loanedFrom ? (
                            <button onClick={onSell} className="flex-1 bg-emerald-700 hover:bg-emerald-600 py-4 rounded-xl font-bold text-lg text-white transition shadow-lg border border-emerald-500 flex flex-col items-center justify-center leading-tight">
                                <span>SPRZEDAJ ({sellPercent}%)</span>
                                {(managerData?.skills?.negotiator > 0) && <span className="text-[10px] text-emerald-300 uppercase tracking-widest font-black">+ Bonus Menedżera</span>}
                            </button>
                        ) : player.buyOption ? (
                            <button onClick={onBuyOption} className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-lg text-white transition shadow-lg border border-blue-400">
                                WYKUP ZAWODNIKA ({formatMoney(player.buyOption)})
                            </button>
                        ) : (
                            <div className="flex-1 flex items-center justify-center bg-slate-800 text-slate-500 py-4 rounded-xl font-bold border border-slate-700">
                                TYLKO WYPOŻYCZENIE
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TopScorers = ({ players, teams }) => { 
    const sorted = [...players].sort((a,b) => b.goals - a.goals || b.assists - a.assists).slice(0, 20); 
    
    return (
        <div className="space-y-8 animate-fade-in">
            {/* NAGŁÓWEK */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(225,29,72,0.5)] z-10 border-2 border-white/20">⚽</div>
                <div className="z-10 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">TOP STRZELCY</h2>
                    <p className="text-rose-300 font-medium mt-1">Najbardziej zabójczy gracze ligi</p>
                </div>
            </div>

            {/* TABELA STRZELCÓW */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-300 min-w-[700px]">
                        <thead className="bg-slate-950/50 uppercase text-[10px] font-black tracking-widest text-slate-500 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5 w-16 text-center">Msc</th>
                                <th className="px-6 py-5">Zawodnik</th>
                                <th className="px-4 py-5">Klub</th>
                                <th className="px-6 py-5 text-center">Gole</th>
                                <th className="px-6 py-5 text-center">Asysty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sorted.map((p, i) => { 
                                const club = teams.find(t => t.id === p.teamId); 
                                
                                // Medale dla Top 3
                                let rankBadge = <span className="text-slate-500 font-mono text-lg">{i+1}</span>;
                                let rowClass = "hover:bg-white/5";
                                
                                if (i === 0) {
                                    rankBadge = <span className="text-2xl drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">🥇</span>;
                                    rowClass = "bg-yellow-900/10 border-l-4 border-yellow-500";
                                } else if (i === 1) {
                                    rankBadge = <span className="text-2xl drop-shadow-[0_0_8px_rgba(148,163,184,0.8)]">🥈</span>;
                                    rowClass = "bg-slate-800/30 border-l-4 border-slate-400";
                                } else if (i === 2) {
                                    rankBadge = <span className="text-2xl drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]">🥉</span>;
                                    rowClass = "bg-amber-900/10 border-l-4 border-amber-600";
                                } else {
                                    rowClass += " border-l-4 border-transparent";
                                }

                                return (
                                    <tr key={p.id} className={`transition-colors group ${rowClass}`}>
                                        <td className="px-6 py-4 text-center">{rankBadge}</td>
                                        <td className="px-6 py-4 flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full overflow-hidden shadow border border-slate-700 flex items-center justify-center bg-slate-800">
                                                <FlagIcon code={p.nation?.code} size="md" />
                                            </div>
                                            <span className={`text-base font-bold transition-colors ${i < 3 ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                {p.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
                                            {club ? club.name : 'Wolny Agent'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-2xl font-black ${i === 0 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'text-rose-400'}`}>
                                                {p.goals}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-slate-500 font-mono text-lg bg-slate-950/50 px-3 py-1 rounded-lg border border-white/5">
                                                {p.assists}
                                            </span>
                                        </td>
                                    </tr>
                                ); 
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    ); 
};
const MenuButton = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group
        ${active 
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-500/50 transform scale-[1.02]' 
            : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
    >
        <span className={`text-xl transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'group-hover:scale-110 grayscale group-hover:grayscale-0'}`}>
            {icon}
        </span>
        <span className="font-bold text-sm tracking-wide">{label}</span>
        
        {/* Mała kropka sygnalizująca aktywną zakładkę z prawej strony */}
        {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white] animate-pulse"></div>}
    </button>
);

const MultiLeagueTable = ({ teams, activeTab, setTab, myTeam }) => { 
    const leagueTeams = teams
        .filter(t => t.league === activeTab && t.country === myTeam.country)
        .sort((a,b) => b.points - a.points || (b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst));
        
    const getRowStyle = (idx, total, teamId) => { 
        const isMyTeam = String(teamId) === String(myTeam.id);
        let base = `border-l-4 transition-all duration-300 ${isMyTeam ? 'bg-purple-900/30 hover:bg-purple-900/50 shadow-[inset_0_0_30px_rgba(168,85,247,0.15)] ' : 'hover:bg-white/5 '}`;

        if(activeTab === 1) { 
            if(idx === 0) return base + 'border-emerald-500 bg-gradient-to-r from-emerald-900/20 to-transparent'; 
            if(idx >= total-3) return base + 'border-red-600 bg-gradient-to-r from-red-900/20 to-transparent'; 
        } 
        if(activeTab === 2) { 
            if(idx <= 1) return base + 'border-emerald-500 bg-gradient-to-r from-emerald-900/20 to-transparent'; 
            if(idx >= 2 && idx <= 5) return base + 'border-yellow-500 bg-gradient-to-r from-yellow-900/20 to-transparent'; 
            if(idx >= total-3) return base + 'border-red-600 bg-gradient-to-r from-red-900/20 to-transparent'; 
        }
        if(activeTab === 3) { 
            if(idx <= 1) return base + 'border-emerald-500 bg-gradient-to-r from-emerald-900/20 to-transparent'; 
            if(idx >= 2 && idx <= 5) return base + 'border-yellow-500 bg-gradient-to-r from-yellow-900/20 to-transparent'; 
        }
        return base + 'border-transparent'; 
    }; 

    return ( 
        <div className="space-y-8 animate-fade-in"> 
            
            {/* NAGŁÓWEK GLASSMORPHISM */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic flex items-center justify-center md:justify-start gap-3">
                        <span>🏆</span> TABELA LIGOWA
                    </h2>
                    <p className="text-slate-400 mt-1">Sytuacja na krajowym podwórku</p>
                </div>
                
                {/* PRZYCISKI ZAKŁADEK LIGOWYCH */}
                <div className="relative z-10 flex bg-slate-950/50 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                    {[1, 2, 3].map(id => (
                        <button key={id} onClick={()=>setTab(id)} className={`px-8 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 ${activeTab===id ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                            Liga {id}
                        </button>
                    ))}
                </div>
            </div>

            {/* TABELA GŁÓWNA */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-300 min-w-[750px]">
                        <thead className="bg-slate-950/50 uppercase text-[10px] font-black tracking-widest text-slate-500 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5">#</th>
                                <th className="px-6 py-5">Klub</th>
                                <th className="px-3 py-5 text-center">M</th>
                                <th className="px-3 py-5 text-center">W</th>
                                <th className="px-3 py-5 text-center">R</th>
                                <th className="px-3 py-5 text-center">P</th>
                                <th className="px-3 py-5 text-center">Bilans</th>
                                <th className="px-6 py-5 text-center">Punkty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {leagueTeams.map((t, i) => {
                                const isMyTeam = String(t.id) === String(myTeam.id);
                                return (
                                    <tr key={t.id} className={`group ${getRowStyle(i, leagueTeams.length, t.id)}`}>
                                        <td className="px-6 py-4 font-mono font-bold opacity-50 group-hover:opacity-100 transition-opacity text-lg">{i+1}</td>
                                        <td className="px-6 py-4 font-bold flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border shadow-sm ${isMyTeam ? 'border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'border-slate-700 bg-slate-800'}`}>
                                                <FlagIcon code={t.country} size="md" />
                                            </div>
                                            <span className={`text-base transition-colors ${isMyTeam ? 'text-purple-300 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]' : 'text-white group-hover:text-emerald-300'}`}>
                                                {t.name}
                                            </span>
                                            {/* ZNACZNIKI */}
                                            {activeTab > 1 && i <= 1 && <span className="text-[9px] font-black tracking-wider bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">AWANS</span>}
                                            {activeTab > 1 && i >= 2 && i <= 5 && <span className="text-[9px] font-black tracking-wider bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">BARAŻ</span>}
                                            {activeTab < 3 && i >= leagueTeams.length-3 && <span className="text-[9px] font-black tracking-wider bg-red-900/50 text-red-400 px-2 py-0.5 rounded border border-red-500/30">SPADEK</span>}
                                            {isMyTeam && <span className="text-[9px] font-black tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded shadow-[0_0_10px_rgba(147,51,234,0.8)] ml-2 animate-pulse">TY</span>}
                                        </td>
                                        <td className="px-3 py-4 text-center font-mono text-white">{t.played}</td>
                                        <td className="px-3 py-4 text-center text-slate-500 font-mono">{t.won}</td>
                                        <td className="px-3 py-4 text-center text-slate-500 font-mono">{t.drawn}</td>
                                        <td className="px-3 py-4 text-center text-slate-500 font-mono">{t.lost}</td>
                                        <td className="px-3 py-4 text-center text-slate-400 font-mono">{t.goalsFor}:{t.goalsAgainst}</td>
                                        <td className={`px-6 py-4 text-center font-black text-2xl ${isMyTeam ? 'text-purple-400' : 'text-white'}`}>{t.points}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div> 
        </div> 
    ); 
};
const StatBar = ({ label, value }) => ( <div> <div className="flex justify-between text-xs mb-1 text-slate-400"> <span>{label}</span> <span>{value}</span> </div> <div className="h-2 bg-slate-800 rounded-full overflow-hidden"> <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, value)}%` }}></div> </div> </div> );
const CupView = ({ history, myTeamId }) => ( 
    <div className="space-y-8 animate-fade-in"> 
        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
            <div className="absolute top-0 left-0 w-64 h-64 bg-red-600/20 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(239,68,68,0.5)] z-10 border-b-2 border-white/20">🇵🇱</div>
            <div className="z-10 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">PUCHAR KRAJOWY</h2> 
                <p className="text-slate-400 mt-1">Rozgrywki o puchar i prestiż</p>
            </div>
        </div>
        
        {history.length === 0 ? <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/5 text-slate-500 text-lg">Puchar jeszcze nie wystartował.</div> : ( 
            <div className="space-y-8"> 
                {history.map((round, idx) => ( 
                    <div key={idx} className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl"> 
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 font-black text-white text-center border-b border-white/5 tracking-widest text-sm uppercase shadow-sm">
                            {round.round}
                        </div> 
                        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4"> 
                            {round.matches.map((m, mIdx) => { 
                                const isHostWinner = String(m.winnerId) === String(m.hostId); 
                                const isGuestWinner = String(m.winnerId) === String(m.guestId);
                                const isHostMyTeam = String(m.hostId) === String(myTeamId);
                                const isGuestMyTeam = String(m.guestId) === String(myTeamId);

                                return ( 
                                    <div key={mIdx} className="flex justify-between items-center bg-slate-950/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors"> 
                                        
                                        {/* GOSPODARZ */}
                                        <div className={`flex-1 text-right flex items-center justify-end gap-2 truncate ${isHostWinner ? "font-black text-white" : "text-slate-500 font-medium"}`}>
                                            <span className={`truncate ${isHostMyTeam ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : ''}`}>{m.host}</span>
                                            {isHostMyTeam && <span className="text-xs" title="Twój Klub">⭐</span>}
                                            {isHostWinner && <span className="text-emerald-500 text-xs">🏆</span>}
                                        </div> 

                                        {/* WYNIK */}
                                        <div className="mx-4 flex flex-col items-center min-w-[70px]">
                                            <div className="bg-slate-900 px-3 py-1.5 rounded-lg text-white font-mono font-bold border border-slate-700 shadow-inner flex items-center gap-1">
                                                <span>{m.scoreA}</span><span className="text-slate-500">:</span><span>{m.scoreB}</span>
                                            </div>
                                            {m.isPenalties && <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mt-1 bg-yellow-900/30 px-1.5 rounded">Karne</span>}
                                        </div> 

                                        {/* GOŚĆ */}
                                        <div className={`flex-1 text-left flex items-center justify-start gap-2 truncate ${isGuestWinner ? "font-black text-white" : "text-slate-500 font-medium"}`}>
                                            {isGuestWinner && <span className="text-emerald-500 text-xs">🏆</span>}
                                            {isGuestMyTeam && <span className="text-xs" title="Twój Klub">⭐</span>}
                                            <span className={`truncate ${isGuestMyTeam ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : ''}`}>{m.guest}</span>
                                        </div> 
                                    </div> 
                                ); 
                            })} 
                        </div> 
                    </div> 
                ))} 
            </div> 
        )} 
    </div> 
);

const ChampionsLeagueView = ({ clState, myTeamId }) => {
    if (!clState) return <div className="text-center py-20 text-slate-500">Brak danych LM</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            
            {/* NAGŁÓWEK LM */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-indigo-500/20 shadow-[0_0_40px_rgba(59,130,246,0.15)] relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(59,130,246,0.6)] z-10 border-2 border-white/20">⭐</div>
                <div className="z-10 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">UEFA CHAMPIONS LEAGUE</h2>
                    <p className="text-blue-300 font-medium mt-1">Elita Europejskiego Futbolu</p>
                </div>
            </div>

            {!clState.active ? (
                <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/5 text-slate-500">
                    <p className="text-2xl font-bold mb-2">Rozgrywki nieaktywne.</p>
                    <p className="text-sm">Zdobądź czołowe miejsce w lidze i sprawdź się w 2. sezonie!</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {(clState.history || []).length === 0 && clState.phase === 'ro32' && (
                        <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-2xl text-center text-blue-300 font-bold animate-pulse shadow-lg">
                            Losowanie zakończone! Mecze 1/16 Finału rozpoczną się w 5. kolejce.
                        </div>
                    )}
                    
                    {(clState.history || []).map((round, idx) => (
                        <div key={idx} className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                            <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 p-5 font-black text-white text-center border-b border-indigo-500/30 tracking-widest flex justify-center items-center gap-3 shadow-md">
                                <span className="text-blue-400 text-lg">⚽</span> {round.round} <span className="text-blue-400 text-lg">⚽</span>
                            </div>
                            
                            <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {(round.matches || []).map((m, mIdx) => {
                                    const isHostWinner = String(m.winnerId) === String(m.hostId);
                                    const isGuestWinner = String(m.winnerId) === String(m.guestId);
                                    const isHostMyTeam = String(m.hostId) === String(myTeamId);
                                    const isGuestMyTeam = String(m.guestId) === String(myTeamId);

                                    return (
                                        <div key={mIdx} className={`flex justify-between items-center bg-slate-950/80 p-4 md:p-5 rounded-2xl border transition-all ${isHostMyTeam || isGuestMyTeam ? 'border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.15)]' : 'border-white/5 hover:border-white/10'}`}>
                                            
                                            {/* GOSPODARZ */}
                                            <div className={`flex-1 text-right flex items-center justify-end gap-2 truncate ${isHostWinner ? "font-black text-white scale-105 transform origin-right" : "text-slate-500 font-medium"}`}>
                                                <span className={`truncate ${isHostMyTeam ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : ''}`}>{m.host}</span>
                                                {isHostMyTeam && <span className="text-xs" title="Twój Klub">⭐</span>}
                                                {isHostWinner && <span className="text-blue-400 text-xs shadow-sm">🔹</span>}
                                            </div>
                                            
                                            {/* WYNIK */}
                                            <div className="mx-4 flex flex-col items-center min-w-[70px]">
                                                <div className="bg-slate-900 px-4 py-2 rounded-xl text-white font-mono font-black border border-indigo-500/30 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] flex items-center gap-1.5 text-lg">
                                                    <span>{m.scoreA}</span><span className="text-slate-600">:</span><span>{m.scoreB}</span>
                                                </div>
                                                {m.isPenalties && <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mt-1.5 bg-yellow-900/30 px-2 py-0.5 rounded border border-yellow-500/20">Karne</span>}
                                            </div>
                                            
                                            {/* GOŚĆ */}
                                            <div className={`flex-1 text-left flex items-center justify-start gap-2 truncate ${isGuestWinner ? "font-black text-white scale-105 transform origin-left" : "text-slate-500 font-medium"}`}>
                                                {isGuestWinner && <span className="text-blue-400 text-xs shadow-sm">🔹</span>}
                                                {isGuestMyTeam && <span className="text-xs" title="Twój Klub">⭐</span>}
                                                <span className={`truncate ${isGuestMyTeam ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : ''}`}>{m.guest}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
const WorldTablesView = ({ teams }) => {
    const [selectedCountry, setSelectedCountry] = useState('GB-ENG');
    const [selectedLeague, setSelectedLeague] = useState(1);

    const filtered = teams
        .filter(t => t.country === selectedCountry && t.league === selectedLeague)
        .sort((a,b) => b.points - a.points || (b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst));

    const getRowColor = (idx, total) => { 
        let base = 'border-l-4 transition-all duration-300 hover:bg-white/5 ';
        if(selectedLeague === 1) { 
            if(idx <= 3) return base + 'border-blue-500 bg-gradient-to-r from-blue-900/20 to-transparent'; // LM
            if(idx >= total-3) return base + 'border-red-600 bg-gradient-to-r from-red-900/20 to-transparent'; // Spadek
        } 
        if(selectedLeague === 2) { 
            if(idx <= 1) return base + 'border-emerald-500 bg-gradient-to-r from-emerald-900/20 to-transparent'; // Awans
            if(idx >= 2 && idx <= 5) return base + 'border-yellow-500 bg-gradient-to-r from-yellow-900/20 to-transparent'; // Baraż
            if(idx >= total-3) return base + 'border-red-600 bg-gradient-to-r from-red-900/20 to-transparent'; // Spadek
        }
        if(selectedLeague === 3) { 
            if(idx <= 1) return base + 'border-emerald-500 bg-gradient-to-r from-emerald-900/20 to-transparent'; // Awans
            if(idx >= 2 && idx <= 5) return base + 'border-yellow-500 bg-gradient-to-r from-yellow-900/20 to-transparent'; // Baraż
        }
        return base + 'border-transparent'; 
    };

    const countriesList = [
        { code: 'GB-ENG', name: 'Anglia' }, { code: 'ES', name: 'Hiszpania' }, 
        { code: 'IT', name: 'Włochy' }, { code: 'DE', name: 'Niemcy' }, 
        { code: 'FR', name: 'Francja' }, { code: 'PL', name: 'Polska' }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* NAGŁÓWEK I FILTRY */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative z-10">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic flex items-center gap-3">
                            <span>🌍</span> LIGI ŚWIATA
                        </h2>
                        <p className="text-slate-400 mt-1">Przeglądaj sytuację na międzynarodowych arenach</p>
                    </div>

                    <div className="flex flex-col items-start xl:items-end gap-3 w-full xl:w-auto">
                        {/* KRAJE */}
                        <div className="flex flex-wrap gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/10 shadow-inner w-full xl:w-auto">
                            {countriesList.map(c => (
                                <button key={c.code} onClick={()=>setSelectedCountry(c.code)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex-1 xl:flex-none justify-center ${selectedCountry===c.code ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                                    <FlagIcon code={c.code} size="sm" /> <span className="hidden md:inline">{c.name}</span>
                                </button>
                            ))}
                        </div>
                        {/* POZIOM LIGOWY */}
                        <div className="flex gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/10 shadow-inner w-full xl:w-auto">
                            {[1, 2, 3].map(lvl => (
                                <button key={lvl} onClick={() => setSelectedLeague(lvl)} className={`flex-1 px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${selectedLeague === lvl ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                                    Liga {lvl}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* TABELA */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-300 min-w-[750px]">
                        <thead className="bg-slate-950/50 uppercase text-[10px] font-black tracking-widest text-slate-500 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5">#</th>
                                <th className="px-6 py-5">Klub</th>
                                <th className="px-3 py-5 text-center">M</th>
                                <th className="px-3 py-5 text-center">W</th>
                                <th className="px-3 py-5 text-center">R</th>
                                <th className="px-3 py-5 text-center">P</th>
                                <th className="px-6 py-5 text-center">Punkty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length === 0 ? <tr><td colSpan="7" className="p-10 text-center font-bold text-slate-500">Brak danych dla tej ligi.</td></tr> : filtered.map((t, i) => (
                                <tr key={t.id} className={`group ${getRowColor(i, filtered.length)}`}>
                                    <td className="px-6 py-4 font-mono font-bold opacity-50 group-hover:opacity-100 transition-opacity text-lg">{i+1}</td>
                                    <td className="px-6 py-4 font-bold flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border border-slate-700 bg-slate-800 shadow-sm">
                                            <FlagIcon code={t.country} size="md" />
                                        </div>
                                        <span className="text-base text-white group-hover:text-cyan-300 transition-colors">
                                            {t.name}
                                        </span>
                                    </td>
                                    <td className="px-3 py-4 text-center font-mono text-white">{t.played}</td>
                                    <td className="px-3 py-4 text-center text-slate-500 font-mono">{t.won}</td>
                                    <td className="px-3 py-4 text-center text-slate-500 font-mono">{t.drawn}</td>
                                    <td className="px-3 py-4 text-center text-slate-500 font-mono">{t.lost}</td>
                                    <td className="px-6 py-4 text-center font-black text-2xl text-white">{t.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
const ScheduleView = ({ schedules, teams, myTeamId, currentWeek }) => {
    const myTeam = teams.find(t => String(t.id) === String(myTeamId));
    if (!myTeam) return <div className="text-center p-10 text-slate-500">Wybierz drużynę.</div>;

    const leagueIdx = (myTeam.league || 1) - 1;
    const leagueSchedule = schedules[leagueIdx];

    if (!leagueSchedule || leagueSchedule.length === 0) {
        return <div className="text-center py-20 text-slate-500 font-medium">Terminarz niedostępny. Zagraj pierwszy sezon!</div>;
    }

    const activeRoundRef = useRef(null);
    useEffect(() => {
        if (activeRoundRef.current) {
            activeRoundRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            
            {/* NAGŁÓWEK GLASSMORPHISM */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(147,51,234,0.5)] z-10 border-2 border-white/20">📅</div>
                <div className="z-10 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">TERMINARZ LIGOWY</h2>
                    <p className="text-purple-300 font-medium mt-1">Droga po mistrzostwo, kolejka po kolejce</p>
                </div>
            </div>

            {/* SIATKA KOLEJEK */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {leagueSchedule.map((roundMatches, roundIndex) => {
                    const roundNum = roundIndex + 1;
                    const isCurrent = roundNum === currentWeek;
                    const isPast = roundNum < currentWeek;

                    return (
                        <div 
                            key={roundIndex} 
                            ref={isCurrent ? activeRoundRef : null}
                            className={`rounded-3xl overflow-hidden border backdrop-blur-md transition-all duration-500 flex flex-col
                                ${isCurrent 
                                    ? 'bg-slate-900/80 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)] transform scale-[1.02] z-10' 
                                    : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60'}`}
                        >
                            {/* Nagłówek konkretnej kolejki */}
                            <div className={`p-4 font-black flex justify-between items-center border-b shadow-sm uppercase tracking-widest text-xs
                                ${isCurrent ? 'bg-gradient-to-r from-yellow-900/40 to-slate-900/40 border-yellow-500/30 text-yellow-400' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                                <span>Kolejka {roundNum}</span>
                                {isCurrent && <span className="bg-yellow-500 text-yellow-950 px-3 py-1 rounded-lg text-[9px] font-black animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.5)]">TERAZ GRAMY</span>}
                                {isPast && <span className="text-[10px] opacity-50 flex items-center gap-1">✅ Zakończona</span>}
                            </div>

                            {/* Lista meczów w kolejce */}
                            <div className="p-3 space-y-1.5 flex-1">
                                {roundMatches.map((m, mIdx) => {
                                    const host = teams.find(t => String(t.id) === String(m.home));
                                    const guest = teams.find(t => String(t.id) === String(m.away));
                                    const isHostMyTeam = String(m.home) === String(myTeamId);
                                    const isGuestMyTeam = String(m.away) === String(myTeamId);
                                    const isMyMatch = isHostMyTeam || isGuestMyTeam;
                                    
                                    const hasScore = m.isPlayed || (m.scoreHome !== undefined && m.scoreHome !== null);

                                    return (
                                        <div key={mIdx} className={`flex justify-between items-center p-3 rounded-2xl transition-colors ${isMyMatch ? 'bg-purple-900/30 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'hover:bg-white/5 border border-transparent'}`}>
                                            
                                            {/* Drużyna Domowa */}
                                            <div className={`w-2/5 text-right truncate text-xs md:text-sm flex items-center justify-end gap-1.5 ${isHostMyTeam ? 'text-purple-300 font-bold drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]' : isPast ? 'text-slate-300 font-medium' : 'text-slate-400'}`}>
                                                <span className="truncate">{host ? host.name : 'Unknown'}</span>
                                                {isHostMyTeam && <span className="text-[10px] drop-shadow-md">⭐</span>}
                                            </div>
                                            
                                            {/* Wynik / Pigułka VS */}
                                            <div className="w-1/5 flex justify-center">
                                                {hasScore ? (
                                                    <div className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs border shadow-inner flex items-center gap-1.5
                                                        ${isMyMatch ? 'bg-purple-950 border-purple-500/50 text-white' : 'bg-slate-950 border-slate-700/50 text-slate-300'}`}>
                                                        <span>{m.scoreHome}</span><span className="text-slate-500 opacity-70">:</span><span>{m.scoreAway}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] font-black text-slate-500 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/5 uppercase tracking-widest shadow-inner">
                                                        VS
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Drużyna Wyjazdowa */}
                                            <div className={`w-2/5 text-left truncate text-xs md:text-sm flex items-center gap-1.5 ${isGuestMyTeam ? 'text-purple-300 font-bold drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]' : isPast ? 'text-slate-300 font-medium' : 'text-slate-400'}`}>
                                                {isGuestMyTeam && <span className="text-[10px] drop-shadow-md">⭐</span>}
                                                <span className="truncate">{guest ? guest.name : 'Unknown'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
const ManagerProfileView = ({ managerData, setManagerData }) => {
    const upgradeSkill = (skillId) => {
        if (managerData.sp <= 0) return alert("Brak Punktów Umiejętności (SP)!");
        if ((managerData.skills[skillId] || 0) >= 3) return alert("Osiągnąłeś maksymalny poziom tej umiejętności!");
        
        setManagerData(prev => ({
            ...prev,
            sp: prev.sp - 1,
            // --- NAPRAWA: Zabezpieczenie przed błędem NaN (Not a Number) ---
            skills: { ...prev.skills, [skillId]: (prev.skills[skillId] || 0) + 1 }
        }));
    };

    const nextLvlXp = managerData.level * 500;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* WIZYTÓWKA */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
                <div className="absolute top-0 left-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px] pointer-events-none"></div>
                
                <div className="w-32 h-32 bg-slate-800 rounded-full border-4 border-slate-700 shadow-inner flex items-center justify-center text-6xl relative z-10">
                    👔
                    <div className="absolute -bottom-4 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-black border-2 border-slate-900 shadow-lg">LVL {managerData.level}</div>
                </div>
                
                <div className="flex-1 relative z-10 w-full text-center md:text-left">
                    <h2 className="text-4xl font-black text-white tracking-tight italic uppercase">Profil Menedżera</h2>
                    <p className="text-slate-400 mt-2 font-medium">Zdobywaj doświadczenie, wbijaj poziomy i kształtuj swój własny styl trenerski.</p>
                    
                    <div className="mt-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 w-full bg-slate-950/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                                <span>Doświadczenie (XP)</span>
                                <span>{managerData.xp} / {nextLvlXp} XP</span>
                            </div>
                            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_10px_rgba(147,51,234,0.8)] transition-all duration-1000" style={{ width: `${(managerData.xp / nextLvlXp) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-purple-900/30 px-6 py-4 rounded-2xl border border-purple-500/50 text-center shadow-[0_0_20px_rgba(147,51,234,0.2)]">
                            <div className="text-[10px] text-purple-300 font-bold uppercase tracking-widest mb-1">Dostępne Punkty</div>
                            <div className="text-3xl font-black text-white">{managerData.sp} <span className="text-lg">SP</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DRZEWKO UMIEJĘTNOŚCI (6 KART) */}
            <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3 ml-2"><span>🧬</span> Drzewko Umiejętności</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* SKILL 1: NEGOCJATOR */}
                <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-blue-500/50 transition-all flex flex-col items-center text-center group">
                    <div className="w-16 h-16 bg-blue-900/30 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-blue-500/30 group-hover:scale-110 transition-transform">🗣️</div>
                    <h4 className="text-xl font-black text-white uppercase">Negocjator</h4>
                    <p className="text-sm text-slate-400 mt-2 mb-6">Zmniejsza koszty zakupu piłkarzy i zwiększa zyski ze sprzedaży o 5% za każdy poziom.</p>
                    
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3].map(lvl => (
                            <div key={lvl} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${(managerData.skills.negotiator || 0) >= lvl ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>{lvl}</div>
                        ))}
                    </div>
                    <button onClick={() => upgradeSkill('negotiator')} disabled={(managerData.skills.negotiator || 0) >= 3 || managerData.sp === 0} className="mt-auto w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl font-black uppercase tracking-widest transition-all">
                        {(managerData.skills.negotiator || 0) >= 3 ? 'Maksymalny Poziom' : 'Ulepsz (1 SP)'}
                    </button>
                </div>

                {/* SKILL 2: MISTRZ TAKTYKI */}
                <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-emerald-500/50 transition-all flex flex-col items-center text-center group">
                    <div className="w-16 h-16 bg-emerald-900/30 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-emerald-500/30 group-hover:scale-110 transition-transform">🛡️</div>
                    <h4 className="text-xl font-black text-white uppercase">Mistrz Taktyki</h4>
                    <p className="text-sm text-slate-400 mt-2 mb-6">Twoja drużyna zyskuje pasywny bonus +2 OVR do Ataku i Obrony w każdym meczu za każdy poziom.</p>
                    
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3].map(lvl => (
                            <div key={lvl} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${(managerData.skills.tactician || 0) >= lvl ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>{lvl}</div>
                        ))}
                    </div>
                    <button onClick={() => upgradeSkill('tactician')} disabled={(managerData.skills.tactician || 0) >= 3 || managerData.sp === 0} className="mt-auto w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl font-black uppercase tracking-widest transition-all">
                        {(managerData.skills.tactician || 0) >= 3 ? 'Maksymalny Poziom' : 'Ulepsz (1 SP)'}
                    </button>
                </div>

                {/* SKILL 3: CUDOTWÓRCA */}
                <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-red-500/50 transition-all flex flex-col items-center text-center group">
                    <div className="w-16 h-16 bg-red-900/30 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-red-500/30 group-hover:scale-110 transition-transform">🏥</div>
                    <h4 className="text-xl font-black text-white uppercase">Cudotwórca</h4>
                    <p className="text-sm text-slate-400 mt-2 mb-6">Obniża ryzyko kontuzji oraz znacząco przyspiesza pasywny rozwój graczy na ławce rezerwowych.</p>
                    
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3].map(lvl => (
                            <div key={lvl} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${(managerData.skills.miracle || 0) >= lvl ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>{lvl}</div>
                        ))}
                    </div>
                    <button onClick={() => upgradeSkill('miracle')} disabled={(managerData.skills.miracle || 0) >= 3 || managerData.sp === 0} className="mt-auto w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl font-black uppercase tracking-widest transition-all">
                        {(managerData.skills.miracle || 0) >= 3 ? 'Maksymalny Poziom' : 'Ulepsz (1 SP)'}
                    </button>
                </div>

                {/* SKILL 4: PSYCHOLOG (NOWY) */}
                <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-orange-500/50 transition-all flex flex-col items-center text-center group">
                    <div className="w-16 h-16 bg-orange-900/30 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-orange-500/30 group-hover:scale-110 transition-transform">🧠</div>
                    <h4 className="text-xl font-black text-white uppercase">Psycholog</h4>
                    <p className="text-sm text-slate-400 mt-2 mb-6">Gracze posadzeni na ławce rezerwowych tracą morale znacznie wolniej. Łagodzi fochy gwiazd.</p>
                    
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3].map(lvl => (
                            <div key={lvl} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${(managerData.skills.motivator || 0) >= lvl ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>{lvl}</div>
                        ))}
                    </div>
                    <button onClick={() => upgradeSkill('motivator')} disabled={(managerData.skills.motivator || 0) >= 3 || managerData.sp === 0} className="mt-auto w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl font-black uppercase tracking-widest transition-all">
                        {(managerData.skills.motivator || 0) >= 3 ? 'Maksymalny Poziom' : 'Ulepsz (1 SP)'}
                    </button>
                </div>

                {/* SKILL 5: ŁOWCA TALENTÓW (NOWY) */}
                <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-cyan-500/50 transition-all flex flex-col items-center text-center group">
                    <div className="w-16 h-16 bg-cyan-900/30 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-cyan-500/30 group-hover:scale-110 transition-transform">🕵️‍♂️</div>
                    <h4 className="text-xl font-black text-white uppercase">Łowca Talentów</h4>
                    <p className="text-sm text-slate-400 mt-2 mb-6">Wysyłanie skautów jest tańsze o 15% co poziom, a znalezieni juniorzy mają wyraźnie wyższy OVR i Potencjał.</p>
                    
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3].map(lvl => (
                            <div key={lvl} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${(managerData.skills.scout || 0) >= lvl ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>{lvl}</div>
                        ))}
                    </div>
                    <button onClick={() => upgradeSkill('scout')} disabled={(managerData.skills.scout || 0) >= 3 || managerData.sp === 0} className="mt-auto w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl font-black uppercase tracking-widest transition-all">
                        {(managerData.skills.scout || 0) >= 3 ? 'Maksymalny Poziom' : 'Ulepsz (1 SP)'}
                    </button>
                </div>

                {/* SKILL 6: REKIN FINANSJERY (NOWY) */}
                <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-yellow-500/50 transition-all flex flex-col items-center text-center group">
                    <div className="w-16 h-16 bg-yellow-900/30 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-yellow-500/30 group-hover:scale-110 transition-transform">💼</div>
                    <h4 className="text-xl font-black text-white uppercase">Rekin Finansjery</h4>
                    <p className="text-sm text-slate-400 mt-2 mb-6">Generuje co tydzień całkowicie pasywny przychód w wysokości 30 000 € za każdy wykupiony poziom.</p>
                    
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3].map(lvl => (
                            <div key={lvl} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${(managerData.skills.financier || 0) >= lvl ? 'bg-yellow-500 text-white border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>{lvl}</div>
                        ))}
                    </div>
                    <button onClick={() => upgradeSkill('financier')} disabled={(managerData.skills.financier || 0) >= 3 || managerData.sp === 0} className="mt-auto w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-800 text-slate-900 disabled:text-slate-500 rounded-xl font-black uppercase tracking-widest transition-all">
                        {(managerData.skills.financier || 0) >= 3 ? 'Maksymalny Poziom' : 'Ulepsz (1 SP)'}
                    </button>
                </div>

            </div>
        </div>
    );
};
// --- NOWOŚĆ: SALA CHWAŁY (GALA) ---
const HallOfFameView = ({ hallOfFame }) => (
    <div className="space-y-12 animate-fade-in pb-20">
        
        {/* NAGŁÓWEK GALI */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-10 rounded-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.15)] relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent pointer-events-none"></div>
            
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 rounded-full flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(234,179,8,0.8)] z-10 border-4 border-yellow-100 mb-6">
                ⭐
            </div>
            
            <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-700 tracking-tighter uppercase italic drop-shadow-lg">
                    SALA CHWAŁY
                </h2>
                <p className="text-yellow-200/70 font-medium mt-2 text-lg uppercase tracking-widest">Historyczni zdobywcy nagród sezonu</p>
            </div>
        </div>

        {hallOfFame.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/5 text-slate-500 text-xl font-light italic">
                Rozegraj pełny sezon, aby odbyła się pierwsza Gala Piłkarska.
            </div>
        ) : (
            <div className="space-y-12">
                {hallOfFame.map((h, i) => (
                    <div key={i} className="relative bg-slate-900/80 backdrop-blur-md rounded-[3rem] border border-white/10 p-8 md:p-12 shadow-2xl">
                        
                        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-slate-800 to-slate-900 border border-yellow-500/50 px-8 py-2 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)] z-20">
                            <span className="text-yellow-500 font-black uppercase tracking-widest text-sm">Sezon {h.season}</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6 relative z-10">
                            
                            {/* ZŁOTY BUT */}
                            <div className="bg-slate-950 rounded-3xl p-6 border border-slate-700/50 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)] relative overflow-hidden">
                                <div className="absolute top-0 w-full h-1 bg-slate-400"></div>
                                <div className="text-4xl mb-4 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all">👟</div>
                                <h4 className="text-xs text-slate-500 font-black uppercase tracking-widest mb-1">Złoty But</h4>
                                <div className="text-xl font-black text-white mb-2">{h.goldenBoot.name}</div>
                                <div className="flex items-center gap-2 mb-4">
                                    <FlagIcon code={h.goldenBoot.nation} size="sm" />
                                    <span className="text-xs text-slate-400 font-bold">{h.goldenBoot.club}</span>
                                </div>
                                <div className="mt-auto bg-slate-900 px-4 py-2 rounded-xl border border-white/5 text-slate-300 font-mono font-bold text-sm w-full">
                                    {h.goldenBoot.stat}
                                </div>
                            </div>

                            {/* ZŁOTA PIŁKA (ŚRODEK - NAJWIĘKSZA) */}
                            <div className="bg-gradient-to-b from-yellow-900/40 to-slate-950 rounded-[2.5rem] p-8 border-2 border-yellow-500/50 flex flex-col items-center text-center transform lg:scale-110 z-10 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                                <div className="text-6xl mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-pulse">🏆</div>
                                <h4 className="text-sm text-yellow-500 font-black uppercase tracking-widest mb-2">Złota Piłka</h4>
                                <div className="text-3xl font-black text-white mb-2 leading-tight tracking-tight">{h.ballonDor.name}</div>
                                <div className="flex items-center gap-2 mb-6">
                                    <FlagIcon code={h.ballonDor.nation} size="md" />
                                    <span className="text-sm text-yellow-100/70 font-bold">{h.ballonDor.club}</span>
                                </div>
                                <div className="mt-auto bg-gradient-to-r from-yellow-600 to-amber-600 px-6 py-3 rounded-xl border border-yellow-400/50 text-white font-black text-sm w-full shadow-inner tracking-wider">
                                    {h.ballonDor.stat}
                                </div>
                            </div>

                            {/* ZŁOTA RĘKAWICA */}
                            <div className="bg-slate-950 rounded-3xl p-6 border border-slate-700/50 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)] relative overflow-hidden">
                                <div className="absolute top-0 w-full h-1 bg-amber-600"></div>
                                <div className="text-4xl mb-4 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all">🧤</div>
                                <h4 className="text-xs text-slate-500 font-black uppercase tracking-widest mb-1">Złota Rękawica</h4>
                                <div className="text-xl font-black text-white mb-2">{h.goldenGlove.name}</div>
                                <div className="flex items-center gap-2 mb-4">
                                    <FlagIcon code={h.goldenGlove.nation} size="sm" />
                                    <span className="text-xs text-slate-400 font-bold">{h.goldenGlove.club}</span>
                                </div>
                                <div className="mt-auto bg-slate-900 px-4 py-2 rounded-xl border border-white/5 text-slate-300 font-mono font-bold text-sm w-full">
                                    {h.goldenGlove.stat}
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);
// --- NOWOŚĆ: EKRAN WYBORU SPONSORA ---
const SponsorSelectionModal = ({ team, onSelect }) => {
    // Generowanie ofert w oparciu o siłę ligi (L1 to miliony, L3 to grosze)
    const getOffers = () => {
        if (team.league === 1) {
            return [
                { name: "Global-Bank (Bezpieczny)", type: "safe", desc: "Ogromny zastrzyk gotówki od zaraz. Brak premii końcowej za wyniki.", upfrontAmount: 4000000, bonusAmount: 0, reqLeaguePos: null, reqCup: false },
                { name: "Krajowe Linie (Zbalansowany)", type: "balanced", desc: "Zabezpiecza start, wypłaca fortunę za awans do Ligi Mistrzów.", upfrontAmount: 1500000, bonusAmount: 6000000, reqLeaguePos: 4, reqCup: false },
                { name: "CryptoBet (Zabójczy)", type: "risky", desc: "Grosze na start. Gigantyczna fortuna za podwójną koronę!", upfrontAmount: 500000, bonusAmount: 18000000, reqLeaguePos: 1, reqCup: true }
            ];
        } else if (team.league === 2) {
            return [
                { name: "Lokalny Holding (Bezpieczny)", type: "safe", desc: "Solidny budżet na sezon, zero presji.", upfrontAmount: 1200000, bonusAmount: 0, reqLeaguePos: null, reqCup: false },
                { name: "Ambitne Budownictwo (Zbalansowany)", type: "balanced", desc: "Wymaga wywalczenia bezpośredniego awansu do 1. Ligi.", upfrontAmount: 500000, bonusAmount: 2500000, reqLeaguePos: 2, reqCup: false },
                { name: "Szejk Investment (Zabójczy)", type: "risky", desc: "Wymaga absolutnej dominacji w lidze i zdobycia 1. miejsca.", upfrontAmount: 200000, bonusAmount: 5000000, reqLeaguePos: 1, reqCup: false }
            ];
        } else {
            return [
                { name: "Piekarnia u Janka (Bezpieczny)", type: "safe", desc: "Skromny datek, ale gwarantowany z góry.", upfrontAmount: 400000, bonusAmount: 0, reqLeaguePos: null, reqCup: false },
                { name: "Hurtownia Części (Zbalansowany)", type: "balanced", desc: "Premia wypłacona za awans z Ligi 3.", upfrontAmount: 150000, bonusAmount: 800000, reqLeaguePos: 2, reqCup: false },
                { name: "Magiczne Suplementy (Zabójczy)", type: "risky", desc: "Oczekują cudu – Mistrzostwa 3. Ligi i dojścia daleko w Pucharze.", upfrontAmount: 50000, bonusAmount: 2000000, reqLeaguePos: 1, reqCup: false }
            ];
        }
    };

    const offers = getOffers();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-[3rem] shadow-2xl p-8 md:p-12 animate-slide-up relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="text-center mb-10 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter uppercase drop-shadow-md">
                        Kontrakty Sponsorskie
                    </h2>
                    <p className="text-slate-400 mt-2 font-medium">Rozpoczyna się nowy sezon. Zarząd oczekuje, że wybierzesz głównego sponsora na koszulki.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                    {offers.map((off, idx) => (
                        <div key={idx} className="bg-slate-950 rounded-3xl p-6 border border-white/5 flex flex-col hover:-translate-y-2 transition-transform hover:shadow-[0_10px_30px_rgba(79,70,229,0.2)] group">
                            
                            <div className={`w-full py-2 text-center rounded-xl font-black uppercase tracking-widest text-xs mb-6 ${off.type === 'safe' ? 'bg-blue-900/40 text-blue-400' : off.type === 'balanced' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400 animate-pulse'}`}>
                                {off.type === 'safe' ? 'Niskie Ryzyko' : off.type === 'balanced' ? 'Złoty Środek' : 'Wysokie Ryzyko'}
                            </div>

                            <h3 className="text-xl font-black text-white mb-2 leading-tight">{off.name}</h3>
                            <p className="text-sm text-slate-500 flex-1">{off.desc}</p>

                            <div className="mt-6 space-y-3 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Gotówka Startowa</span>
                                    <span className="font-mono font-bold text-white">{formatMoney(off.upfrontAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                                    <span className="text-[10px] text-indigo-400 uppercase font-black tracking-wider">Premia za Wynik</span>
                                    <span className="font-mono font-black text-indigo-400">{formatMoney(off.bonusAmount)}</span>
                                </div>
                            </div>

                            <div className="mt-4 p-3 border border-slate-700 border-dashed rounded-xl bg-slate-900">
                                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Wymagany Cel:</div>
                                <div className="text-xs font-bold text-white">
                                    {off.reqLeaguePos ? `🔥 Min. ${off.reqLeaguePos}. miejsce w lidze` : '✅ Utrzymanie w lidze'}
                                </div>
                                {off.reqCup && <div className="text-xs font-bold text-amber-400 mt-1">🏆 Zdobycie Pucharu Polski</div>}
                            </div>

                            <button onClick={() => onSelect(off)} className="mt-6 w-full py-4 bg-slate-800 hover:bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg">
                                Podpisz Umowę
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
// --- NOWOŚĆ: ROZBUDOWA INFRASTRUKTURY (TYCOON) ---
const InfrastructureView = ({ infrastructure, setInfrastructure, budget, setBudget }) => {
    // Koszty rozbudowy na kolejne poziomy (Level 2: 2M, Lvl 3: 5M, Lvl 4: 12M, Lvl 5: 30M)
    const getUpgradeCost = (currentLevel) => {
        if (currentLevel === 1) return 2000000;
        if (currentLevel === 2) return 5000000;
        if (currentLevel === 3) return 12000000;
        if (currentLevel === 4) return 30000000;
        return 0; // Max level
    };

    const handleUpgrade = (type, currentLevel, name) => {
        if (currentLevel >= 5) return alert("Ten obiekt osiągnął maksymalny poziom!");
        const cost = getUpgradeCost(currentLevel);
        
        if (budget < cost) {
            return alert(`Niewystarczające środki! Brakuje Ci ${formatMoney(cost - budget)} do rozbudowy.`);
        }

        if (window.confirm(`Czy na pewno chcesz zainwestować ${formatMoney(cost)} w rozbudowę: ${name}?`)) {
            setBudget(prev => prev - cost);
            setInfrastructure(prev => ({ ...prev, [type]: prev[type] + 1 }));
            alert(`🎉 Budowa zakończona! ${name} osiągnął poziom ${currentLevel + 1}.`);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* NAGŁÓWEK */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(16,185,129,0.5)] border-b-2 border-white/20">🏗️</div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">OBIEKTY KLUBOWE</h2>
                        <p className="text-emerald-300 mt-1 font-bold tracking-wide">Inwestuj zarobione miliony w przyszłość klubu</p>
                    </div>
                </div>
                <div className="relative z-10 flex flex-col items-start md:items-end">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Budżet na Inwestycje</div>
                    <div className="text-2xl font-mono font-black text-emerald-400 bg-slate-950/80 px-5 py-2 rounded-xl border border-emerald-500/30 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                        {formatMoney(budget)}
                    </div>
                </div>
            </div>

            {/* KARTY OBIEKTÓW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. STADION */}
                <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                    <div className="absolute -right-10 -top-10 text-9xl opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">🏟️</div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Stadion</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Zwiększa regularne przychody z biletów i dnia meczowego.</p>
                        </div>
                        <div className="bg-blue-900/30 text-blue-400 font-black px-4 py-2 rounded-xl border border-blue-500/30">LVL {infrastructure.stadium}</div>
                    </div>
                    
                    <div className="flex gap-1 mb-6">
                        {[1, 2, 3, 4, 5].map(lvl => (
                            <div key={lvl} className={`h-2 flex-1 rounded-full ${infrastructure.stadium >= lvl ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-slate-800'}`}></div>
                        ))}
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 mb-6 flex-1 flex flex-col justify-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Obecny bonus:</div>
                        <div className="text-blue-400 font-mono font-black text-lg">+ {formatMoney((infrastructure.stadium - 1) * 40000)} / Tydzień</div>
                    </div>

                    <button 
                        onClick={() => handleUpgrade('stadium', infrastructure.stadium, 'Stadion')}
                        disabled={infrastructure.stadium >= 5}
                        className="w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent bg-blue-600 hover:bg-blue-500 text-white shadow-lg border border-blue-400"
                    >
                        {infrastructure.stadium >= 5 ? 'Maksymalny Poziom' : `Rozbuduj (${formatMoney(getUpgradeCost(infrastructure.stadium))})`}
                    </button>
                </div>

                {/* 2. BAZA TRENINGOWA */}
                <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-amber-500/50 transition-colors">
                    <div className="absolute -right-10 -top-10 text-9xl opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">🏃‍♂️</div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Ośrodek</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Zwiększa szansę na naturalny wzrost statystyk (OVR) piłkarzy.</p>
                        </div>
                        <div className="bg-amber-900/30 text-amber-400 font-black px-4 py-2 rounded-xl border border-amber-500/30">LVL {infrastructure.training}</div>
                    </div>
                    
                    <div className="flex gap-1 mb-6">
                        {[1, 2, 3, 4, 5].map(lvl => (
                            <div key={lvl} className={`h-2 flex-1 rounded-full ${infrastructure.training >= lvl ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-slate-800'}`}></div>
                        ))}
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 mb-6 flex-1 flex flex-col justify-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Obecny bonus:</div>
                        <div className="text-amber-400 font-black text-lg">+ {(infrastructure.training - 1) * 1.5}% Szans na rozwój</div>
                    </div>

                    <button 
                        onClick={() => handleUpgrade('training', infrastructure.training, 'Ośrodek Treningowy')}
                        disabled={infrastructure.training >= 5}
                        className="w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent bg-amber-600 hover:bg-amber-500 text-white shadow-lg border border-amber-400"
                    >
                        {infrastructure.training >= 5 ? 'Maksymalny Poziom' : `Rozbuduj (${formatMoney(getUpgradeCost(infrastructure.training))})`}
                    </button>
                </div>

                {/* 3. KLINIKA MEDYCZNA */}
                <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-rose-500/50 transition-colors">
                    <div className="absolute -right-10 -top-10 text-9xl opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">🏥</div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Klinika</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Przyspiesza powrót z kontuzji i odnowę biologiczną (Forma).</p>
                        </div>
                        <div className="bg-rose-900/30 text-rose-400 font-black px-4 py-2 rounded-xl border border-rose-500/30">LVL {infrastructure.medical}</div>
                    </div>
                    
                    <div className="flex gap-1 mb-6">
                        {[1, 2, 3, 4, 5].map(lvl => (
                            <div key={lvl} className={`h-2 flex-1 rounded-full ${infrastructure.medical >= lvl ? 'bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.8)]' : 'bg-slate-800'}`}></div>
                        ))}
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 mb-6 flex-1 flex flex-col justify-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Obecny bonus:</div>
                        <div className="text-rose-400 font-black text-lg">{(infrastructure.medical - 1) * 10}% Szybsze leczenie</div>
                    </div>

                    <button 
                        onClick={() => handleUpgrade('medical', infrastructure.medical, 'Klinika Medyczna')}
                        disabled={infrastructure.medical >= 5}
                        className="w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent bg-rose-600 hover:bg-rose-500 text-white shadow-lg border border-rose-400"
                    >
                        {infrastructure.medical >= 5 ? 'Maksymalny Poziom' : `Rozbuduj (${formatMoney(getUpgradeCost(infrastructure.medical))})`}
                    </button>
                </div>

            </div>
        </div>
    );
};
// --- NOWOŚĆ: WYDARZENIA FABULARNE (WYBORY) ---
const StoryEventModal = ({ event, onResolve }) => {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-sm p-6">
            <div className="bg-slate-900 border border-slate-600 w-full max-w-3xl rounded-[2rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] p-8 md:p-12 animate-scale-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="text-center mb-10 relative z-10">
                    <div className="text-6xl mb-4 animate-bounce drop-shadow-md">📰</div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic drop-shadow-md border-b-2 border-red-500/50 pb-4 inline-block">
                        {event.title}
                    </h2>
                    <p className="text-slate-300 mt-6 text-lg md:text-xl font-medium leading-relaxed bg-slate-950/60 p-6 rounded-2xl border border-white/5 shadow-inner">
                        {event.desc}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {event.choices.map((choice, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => onResolve(choice)} 
                            className="group bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-white p-6 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:shadow-[0_15px_30px_rgba(255,255,255,0.1)] hover:-translate-y-1"
                        >
                            <span className="text-xl font-black text-white mb-4 group-hover:text-red-400 transition-colors leading-tight">{choice.text}</span>
                            
                            <div className="flex flex-wrap justify-center gap-2 mt-auto">
                                {choice.budgetChange !== 0 && (
                                    <span className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black border ${choice.budgetChange > 0 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/30' : 'bg-red-900/50 text-red-400 border-red-500/30'}`}>
                                        Kasa {choice.budgetChange > 0 ? '+' : ''}{formatMoney(choice.budgetChange)}
                                    </span>
                                )}
                                {choice.moraleChange !== undefined && (
                                    <span className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black border ${choice.moraleChange > 0 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/30' : 'bg-orange-900/50 text-orange-400 border-orange-500/30'}`}>
                                        Morale {choice.moraleChange > 0 ? '+' : ''}{choice.moraleChange}
                                    </span>
                                )}
                                {choice.globalMoraleChange !== undefined && (
                                    <span className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black border ${choice.globalMoraleChange > 0 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/30' : 'bg-orange-900/50 text-orange-400 border-orange-500/30'}`}>
                                        Zespół {choice.globalMoraleChange > 0 ? '+' : ''}{choice.globalMoraleChange}
                                    </span>
                                )}
                                {choice.boardChange !== undefined && (
                                    <span className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black border ${choice.boardChange > 0 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/30' : 'bg-red-900/50 text-red-400 border-red-500/30'}`}>
                                        Zarząd {choice.boardChange > 0 ? '+' : ''}{choice.boardChange}%
                                    </span>
                                )}
                                {choice.injuryChange !== undefined && choice.injuryChange > 0 && (
                                    <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black border bg-red-900/50 text-red-400 border-red-500/30 animate-pulse">
                                        Kontuzja {choice.injuryChange} tyg.
                                    </span>
                                )}
                                {choice.injuryChange === 0 && (
                                    <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black border bg-blue-900/50 text-blue-400 border-blue-500/30">
                                        Skuteczne Leczenie
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default App;