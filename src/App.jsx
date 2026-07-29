import React, { useState, useEffect, useRef } from 'react';
import { TEAMS_DATA, SCOUTING_REGIONS, generateSquad, generateJunior, calculatePlayerValue } from './data.js';

// --- STREFA AUDIO ---
const MENU_MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3"; 
const MATCH_MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

// --- BAZA PERKÓW ---
const PERKS = {
    'sniper': { icon: '🎯', name: 'Snajper', desc: 'Instynkt zabójcy. Zawsze wykonuje rzuty karne i rzadko się myli (95% skuteczności).' },
    'wall': { icon: '🧱', name: 'Mur', desc: 'Szef obrony. Jego obecność na boisku obcina rywalowi szanse na stworzenie groźnej akcji.' },
    'glass': { icon: '🚑', name: 'Szklanka', desc: 'Koszmar medyków. Bardzo podatny na urazy (ponad 2x większa szansa na kontuzję w meczu).' },
    'magic': { icon: '🪄', name: 'Magik', desc: 'Widzi więcej niż inni. Znacznie częściej notuje kluczowe asysty z niczego.' },
    'butcher': { icon: '🪓', name: 'Rzeźnik', desc: 'Nie bierze jeńców. Skutecznie przerywa ataki fizycznie, ale łapie dużo więcej kartek.' }
};

const assignRandomPerk = (p) => {
    let player = { ...p };
    if (player.perk !== undefined) return player; 
    player.perk = null; 
    if (player.skill > 65 && Math.random() < 0.25) { 
        const roll = Math.random();
        if (player.position === 'NAP' || player.position === 'POM') {
            if (roll < 0.4) player.perk = 'sniper';
            else if (roll < 0.8) player.perk = 'magic';
            else player.perk = 'glass'; 
        } else {
            if (roll < 0.4) player.perk = 'wall';
            else if (roll < 0.8) player.perk = 'butcher';
            else player.perk = 'glass';
        }
    } else if (Math.random() < 0.05) {
        player.perk = 'glass'; 
    }
    return player;
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

const calculateDynamicBudget = (team) => {
    const ovr = Math.round((team.attack + team.defense) / 2);
    let baseBudget = 0;
    if (team.league === 1) {
        baseBudget = 5000000 + (Math.max(0, ovr - 60) * 800000); 
    } else if (team.league === 2) {
        baseBudget = 1000000 + (Math.max(0, ovr - 55) * 150000);
    } else {
        baseBudget = 200000 + (Math.max(0, ovr - 50) * 50000);
    }
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

const FORMATIONS = {
    '4-4-2': { BR: 1, OBR: 4, POM: 4, NAP: 2 },
    '4-3-3': { BR: 1, OBR: 4, POM: 3, NAP: 3 },
    '3-5-2': { BR: 1, OBR: 3, POM: 5, NAP: 2 },
    '4-2-3-1': { BR: 1, OBR: 4, POM: 5, NAP: 1 },
    '5-3-2': { BR: 1, OBR: 5, POM: 3, NAP: 2 },
    '5-2-3': {BR:1, OBR:5, POM: 2, NAP:3},
    '4-2-4': {BR:1, OBR:4, POM: 2, NAP:4}
};

const simulateMatch = (teamA, teamB, currentPlayers, myTeamId = null, myFormation = null, managerData = null) => {
    const allP = typeof currentPlayers !== 'undefined' ? currentPlayers : [];
    const isMyMatch = myTeamId && (String(teamA.id) === String(myTeamId) || String(teamB.id) === String(myTeamId));

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

    let chancesA = Math.max(1, Math.floor(Math.random() * 4) + 3 + Math.floor(diffA > 0 ? diffA / 2.5 : 0));
    let chancesB = Math.max(1, Math.floor(Math.random() * 4) + 3 + Math.floor(diffB > 0 ? diffB / 2.5 : 0));
    const wallsA = activeA.filter(p => p.perk === 'wall').length;
    const wallsB = activeB.filter(p => p.perk === 'wall').length;
    chancesA = Math.max(0, chancesA - wallsB); 
    chancesB = Math.max(0, chancesB - wallsA);
    if (diffA < -10) chancesA = Math.max(0, chancesA - 2);
    if (diffB < -10) chancesB = Math.max(0, chancesB - 2);

    let foulsA = Math.floor(Math.random() * 8) + 4; 
    let foulsB = Math.floor(Math.random() * 8) + 4;
    foulsA += (activeA.filter(p => p.perk === 'butcher').length * 2);
    foulsB += (activeB.filter(p => p.perk === 'butcher').length * 2);

    let timeline = [];
    
    for(let i=0; i<chancesA; i++) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'chance', team: 'home' });
    for(let i=0; i<chancesB; i++) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'chance', team: 'away' });
    
    let injChanceA = (teamA.id === myTeamId && managerData?.skills?.miracle > 0) ? Math.max(0.04, 0.1 - (managerData.skills.miracle * 0.02)) : 0.1;
    let injChanceB = (teamB.id === myTeamId && managerData?.skills?.miracle > 0) ? Math.max(0.04, 0.1 - (managerData.skills.miracle * 0.02)) : 0.1;
    if (Math.random() < injChanceA) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'injury_check', team: 'home' });
    if (Math.random() < injChanceB) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'injury_check', team: 'away' });
    
    for(let i=0; i<foulsA; i++) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'foul', team: 'home' });
    for(let i=0; i<foulsB; i++) timeline.push({ minute: Math.floor(Math.random() * 90) + 1, type: 'foul', team: 'away' });

    timeline.sort((a,b) => a.minute - b.minute);

    let scoreA = 0; let scoreB = 0; let events = [];
    let redCardsA = 0; let redCardsB = 0;
    let matchYellows = {}; 
    let penaltiesA = 0; let penaltiesB = 0; 

    timeline.forEach(ev => {
        let active = ev.team === 'home' ? activeA : activeB;
        let bench = ev.team === 'home' ? benchA : benchB;
        let diff = ev.team === 'home' ? diffA : diffB;
        
        if (active.length === 0) return;

        let advantage = ev.team === 'home' ? (redCardsB - redCardsA) : (redCardsA - redCardsB);
        let dynamicDiff = diff + (advantage * 20); 

        if (ev.type === 'chance') {
            let baseConversion = 0.25;
            if (dynamicDiff > 0) baseConversion += (dynamicDiff * 0.012); 
            else if (dynamicDiff < 0) baseConversion += (dynamicDiff * 0.008); 
            
            if (advantage > 0) baseConversion += 0.25; 
            if (advantage < 0) baseConversion -= 0.15; 

            if (baseConversion > 0.85) baseConversion = 0.85; 
            if (baseConversion < 0.02) baseConversion = 0.02; 

           if (Math.random() < baseConversion) { 
                const attackers = active.filter(p => p.position === 'NAP' || p.position === 'POM');
                let scorer = attackers.length > 0 ? attackers[Math.floor(Math.random() * attackers.length)] : active[0];
                if (!scorer) scorer = { name: "Błąd obrony (Samobój)" }; 
                const others = active.filter(p => p.id !== scorer?.id);
                let assist = null;
                if (others.length > 0 && Math.random() > 0.4) assist = others[Math.floor(Math.random() * others.length)];
                
                events.push({ minute: ev.minute, type: 'goal', team: ev.team, scorer, assist });
                ev.team === 'home' ? scoreA++ : scoreB++;
            }
        } 
        else if (ev.type === 'injury_check') {
            const idx = Math.floor(Math.random() * active.length);
            let pOut = active[idx];
            const glassPlayers = active.filter(p => p.perk === 'glass');
            if (glassPlayers.length > 0 && Math.random() < 0.6) {
                pOut = glassPlayers[Math.floor(Math.random() * glassPlayers.length)];
            }
            const weeks = Math.floor(Math.random() * 4) + 1;
            events.push({ minute: ev.minute, type: 'injury', team: ev.team, player: pOut, weeks });
            active.splice(idx, 1); 

            if (bench.length > 0) {
                let subIdx = bench.findIndex(p => p.position === pOut.position);
                if (subIdx === -1) subIdx = 0; 
                const pIn = bench.splice(subIdx, 1)[0]; 
                active.push(pIn);
                events.push({ minute: ev.minute, type: 'sub', team: ev.team, playerIn: pIn, playerOut: pOut });
            }
        }
        else if (ev.type === 'foul') {
            if (Math.random() < 0.05) { 
                const penTeam = ev.team === 'home' ? 'away' : 'home'; 
                const penActive = penTeam === 'home' ? activeA : activeB;
                penTeam === 'home' ? penaltiesA++ : penaltiesB++;
                
                let taker = penActive.filter(p => p.position === 'NAP' || p.position === 'POM')[0] || penActive[0];
                const snipers = penActive.filter(p => p.perk === 'sniper');
                if (snipers.length > 0) taker = snipers[0]; 
                if (!taker) taker = { name: "Błąd obrony (Samobój)" }; 
                
                const penaltyChance = taker.perk === 'sniper' ? 0.95 : 0.75; 
                if (Math.random() < penaltyChance) {
                    events.push({ minute: ev.minute, type: 'goal', team: penTeam, scorer: taker, isPenalty: true });
                    penTeam === 'home' ? scoreA++ : scoreB++;
                } else {
                    events.push({ minute: ev.minute, type: 'missed_penalty', team: penTeam, taker: taker });
                }
            }

            if (Math.random() < 0.15) { 
                const idx = Math.floor(Math.random() * active.length);
                const p = active[idx];
                events.push({ minute: ev.minute, type: 'yellow', player: p, team: ev.team });
                
                if (matchYellows[p.id]) { 
                    events.push({ minute: ev.minute, type: 'red', player: p, team: ev.team, secondYellow: true });
                    active.splice(idx, 1); 
                    ev.team === 'home' ? redCardsA++ : redCardsB++;
                } else {
                    matchYellows[p.id] = true;
                }
            } else if (Math.random() < 0.02) { 
                const idx = Math.floor(Math.random() * active.length);
                const p = active[idx];
                events.push({ minute: ev.minute, type: 'red', player: p, team: ev.team });
                active.splice(idx, 1); 
                ev.team === 'home' ? redCardsA++ : redCardsB++;
            }
        }
    });

    return { 
        scoreA, scoreB, events, teamA, teamB, 
        savesA: Math.max(0, chancesB - scoreB), savesB: Math.max(0, chancesA - scoreA), 
        chancesA, chancesB, foulsA, foulsB, 
        cornersA: Math.floor(Math.random() * 6) + 1, cornersB: Math.floor(Math.random() * 6) + 1, 
        freeKicksA: Math.max(0, foulsB - penaltiesA), 
        freeKicksB: Math.max(0, foulsA - penaltiesB), 
        penaltiesA: penaltiesA, penaltiesB: penaltiesB
    };
};

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
  const [activeMainTab, setActiveMainTab] = useState('Klub'); 
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
  
  // Nowe stany do obsługi kontraktów
  const [pendingContractTeam, setPendingContractTeam] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [transferList, setTransferList] = useState([]); 
  const [activeEvent, setActiveEvent] = useState(null);
  const [infrastructure, setInfrastructure] = useState({ stadium: 1, training: 1, medical: 1 });
  const [clState, setClState] = useState({ active: false, phase: '', teams: [], waiting: [], matches: [], history: [] });
  const [userCountryCode,setUserCountryCode]= useState(null);
  const [managerData, setManagerData] = useState({ 
      level: 1, 
      xp: 0, 
      sp: 0, 
      skills: { negotiator: 0, tactician: 0, miracle: 0, motivator: 0, scout: 0, financier: 0 },
      contract: null
  });
  const [selectedPlayerForDetails, setSelectedPlayerForDetails] = useState(null); 
  const [negotiation, setNegotiation] = useState(null); 
  const [swapSourceId, setSwapSourceId] = useState(null); 
  
  const menuAudioRef = useRef(new Audio(MENU_MUSIC_URL));
  const matchAudioRef = useRef(new Audio(MATCH_MUSIC_URL));
  
  const activeCalendar = React.useMemo(() => {
      const totalWeeks = 57; 
      let cal = [];
      let currentRound = 1;
      const cupStages = ['1. Runda', '1/8 Finału', 'Ćwierćfinał', 'Półfinał', 'FINAŁ'];
      const clStages = ['1/16 Finału', '1/8 Finału', 'Ćwierćfinał', 'Półfinał', 'FINAŁ'];
      let cupIdx = 0, clIdx = 0;

      for (let i = 1; i <= totalWeeks; i++) {
          if (i === 56) cal.push({ type: 'CUP', name: `Puchar Krajowy - ${cupStages[4]}` });
          else if (i === 57) cal.push({ type: 'CL', name: `Liga Mistrzów - ${clStages[4]}` });
          else if (i % 5 === 0 && clIdx < 4) cal.push({ type: 'CL', name: `Liga Mistrzów - ${clStages[clIdx++]}` });
          else if (i % 6 === 0 && cupIdx < 4) cal.push({ type: 'CUP', name: `Puchar Krajowy - ${cupStages[cupIdx++]}` });
          else {
              cal.push({ type: 'LEAGUE', round: currentRound, name: `${currentRound}. Kolejka Ligowa` });
              currentRound++;
          }
      }
      return cal;
  }, []);

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

  const saveGame = () => {
      try {
          const slimLastResults = lastResults.slice(0, 10).map((r, idx) => {
              if (idx === 0) return r; 
              return { ...r, events: [] }; 
          });

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
              managerData, hallOfFame, boardConfidence,activeSponsor,infrastructure,
              lastResults: slimLastResults
          };
          
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

  const loadGame = (slotIndex) => {
      try {
          const saved = localStorage.getItem(`pm_save_${slotIndex}`);
          if (saved) {
              const data = JSON.parse(saved);
              setBoardConfidence(data.boardConfidence ?? 100);
              setTeams(data.teams || []);
              setPlayers(data.players || []);
              setTransferList(data.transferList || []); 
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
              setManagerData(data.managerData || { level: 1, xp: 0, sp: 0, skills: { negotiator: 0, tactician: 0, miracle: 0, motivator: 0, scout: 0, financier: 0 }, contract: data.managerData?.contract || null });
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
          setRefreshMenu(prev => !prev); 
      }
  };

 const handleNewGameClick = (slotIndex) => {
      setCurrentSlot(slotIndex);
      setTeams([]); 
      setPlayers([]); 
      setAcademy([]); 
      setBoardConfidence(100);
      setSeasonHistory([]);
      setCupHistory([]); 
      setClState({ active: false, phase: '', teams: [], waiting: [], matches: [], history: [] }); 
      setLastResults([]); 
      setHallOfFame([]);
      setBudget(0);
      setSeasonNum(1); 
      setWeek(1);
      setActiveSponsor(null);
      setShowSponsorModal(false);
      setInfrastructure({ stadium: 1, training: 1, medical: 1 });
      setMyTeamId(null); 
      setMyFormation('4-4-2');
      setCurrentView('dashboard'); 
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

  useEffect(() => {
      if (players.length > 0 && players.some(p => p.perk === undefined)) {
          setPlayers(prev => prev.map(p => assignRandomPerk(p)));
      }
  }, [players]);

  const refreshTransferList = (currentPlayers, userTeamId) => {
      const candidates = currentPlayers.filter(p => p.teamId !== userTeamId && !p.loanedFrom && p.age <= 33);
      const attractive = candidates.filter(p => 
          (p.age <= 23 && p.potential >= 75) || 
          (p.skill >= 68 && p.age <= 30) ||     
          (p.skill >= 80)                       
      );
      const pool = attractive.length >= 15 ? attractive : candidates;
      const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, 15);
      const finalMarket = shuffled.sort((a,b) => b.skill - a.skill);
      setTransferList(finalMarket);
  };

  const handleCountrySelect = (countryCode) => {
      if (!TEAMS_DATA || TEAMS_DATA.length === 0) {
          alert("BŁĄD: Nie znaleziono drużyn w pliku data.js! Sprawdź importy.");
          return;
      }
      let allTeams = TEAMS_DATA.map(t => ({...t, points:0, played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0}));
      setTeams(allTeams); 
      setSeasonNum(1); setWeek(1); setSeasonHistory([]); setNotifications([]); setAcademy([]); setCupHistory([]); setLastResults([]);
      setClState({ active: false, phase: '', matches: [], history: [] });
      setUserCountryCode(countryCode);
      
      let newPlayers = [];
      allTeams.forEach(team => { 
          newPlayers = [...newPlayers, ...generateSquad(team.id, team)]; 
      });
      setPlayers(newPlayers); 
      
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
    const t = teams.find(tm => tm.id === teamId);
    if(t) {
        setPendingContractTeam(t);
        setAppMode('CONTRACT'); // <-- Wymuszamy przejście do ekranu umowy!
    }
  };

  const executeTransfer = (player, type) => {
      if(players.filter(p => p.teamId === myTeamId).length >= 28) { alert("Masz pełny skład (max 28)!"); return; }

      const discount = managerData.skills.negotiator * 0.05; 
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

  const sellOwnPlayer = (player) => {
      const myCount = players.filter(p => p.teamId === myTeamId).length;
      if (myCount <= 14) { alert("Zarząd blokuje transfer: Masz zbyt wąską kadrę"); return; }

      const currentSellPercentage = 75 + (managerData.skills.negotiator * 5);
      const sellPrice = Math.floor(player.value * (currentSellPercentage / 100));

      if(window.confirm(`Czy chcesz sprzedać zawodnika ${player.name} za ${formatMoney(sellPrice)}? \n(Dzięki zdolnościom Negocjatora, to aż ${currentSellPercentage}% jego wartości rynkowej!)`)) {
          setBudget(prev => prev + sellPrice);
          
          setPlayers(prev => {
              let newPlayers = prev.filter(p => p.id !== player.id);
              if (player.isStarter) {
                  const myBench = newPlayers.filter(p => p.teamId === myTeamId && !p.isStarter);
                  if (myBench.length > 0) {
                      let sub = myBench.find(p => p.position === player.position);
                      if (!sub) sub = myBench[0]; 
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
          setSelectedPlayerForDetails(null); 
      }
  };

  const triggerBuyOption = (player) => {
      if (String(player.teamId) === String(myTeamId)) {
          alert("Ten zawodnik gra już u Ciebie!");
          return;
      }
      
      let sellerTeam = teams.find(t => String(t.id) === String(player.teamId));
      if (!sellerTeam || !player.teamId || player.teamId === "null") {
          sellerTeam = { name: "Wolny Agent (Przedstawiciel Piłkarza)" };
      }
      setSelectedPlayerForDetails(null); 
      setNegotiation({ player, sellerTeam }); 
  };

 const handleSwapRequest = (playerId) => {
      if (swapSourceId === null) { 
          setSwapSourceId(playerId); 
          setSelectedPlayerForDetails(null); 
          return;
      } 
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

          let myStarters = players.filter(p => p.teamId === myTeamId && p.isStarter);
          myStarters = myStarters.filter(p => p.id !== starterGoingToBench.id);
          myStarters.push(benchGoingToStarter);

          const counts = { BR: 0, OBR: 0, POM: 0, NAP: 0 };
          myStarters.forEach(p => counts[p.position] = (counts[p.position] || 0) + 1);

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
      const scoutLevel = managerData?.skills?.scout || 0;
      const discount = scoutLevel * 0.15; 
      const finalCost = Math.floor(region.cost * (1 - discount));

      if (budget < finalCost) { alert(`Brak środków! Potrzebujesz ${formatMoney(finalCost)}`); return; }
      
      setBudget(prev => prev - finalCost);
      const count = Math.floor(Math.random() * 2) + 1; 
      let newbies = []; 
      
      for(let i=0; i<count; i++) {
          let j = assignRandomPerk(generateJunior(region.id));
          if (scoutLevel > 0) {
              j.skill += (scoutLevel * 2); 
              j.potential += (scoutLevel * 3); 
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

  const handleResolveEvent = (choice) => {
      const budgetImpact = choice.budgetChange ? Number(choice.budgetChange) : 0;
      if (budgetImpact < 0 && Number(budget) < Math.abs(budgetImpact)) {
          alert(`❌ Zarząd blokuje decyzję! Brak środków na koncie.`);
          return; 
      }
      if (budgetImpact !== 0) setBudget(b => Number(b) + budgetImpact);
      if (choice.boardChange) setBoardConfidence(b => Math.max(0, Math.min(100, Number(b) + choice.boardChange)));
      
      setPlayers(prev => prev.map(p => {
          if (String(p.teamId) !== String(myTeamId)) return p; 
          let newP = { ...p };
          
          if (activeEvent?.targetPlayerId && String(p.id) === String(activeEvent.targetPlayerId)) {
              if (choice.moraleChange) newP.morale = Math.max(0, Math.min(100, Number(newP.morale || 100) + choice.moraleChange));
              if (choice.injuryChange !== undefined && choice.injuryChange > 0) newP.injury = choice.injuryChange;
              if (choice.suspensionChange !== undefined && choice.suspensionChange > 0) newP.suspension = (newP.suspension || 0) + choice.suspensionChange;
              if (choice.potentialChange !== undefined && choice.potentialChange > 0) newP.potential = Math.min(99, newP.potential + choice.potentialChange);
          }
          if (choice.globalMoraleChange) {
              newP.morale = Math.max(0, Math.min(100, Number(newP.morale || 100) + choice.globalMoraleChange));
          }
          return newP;
      }));

      setNotifications(prev => [{text: `📰 Prasa: ${choice.logText}`, value: budgetImpact}, ...prev]);
      setActiveEvent(null); 
  };

  const startWeekSimulation = () => {
    const mySquad = players.filter(p => p.teamId === myTeamId);
    const starters = mySquad.filter(p => p.isStarter);

    if (starters.length !== 11) { alert(`Nieprawidłowa liczba zawodników! Masz: ${starters.length}. Wymagane: 11.`); setCurrentView('squad'); return; }
    if (!starters.some(p => p.position === 'BR')) { alert("Brakuje bramkarza (BR)!"); setCurrentView('squad'); return; }
    const injuredStarter = starters.find(p => p.injury > 0);
    if (injuredStarter) { alert(`${injuredStarter.name} ma kontuzję i nie może grać!`); setCurrentView('squad'); return; }

    if (week > activeCalendar.length) return; 
    const currentEvent = activeCalendar[week - 1];
    if (week % 4 === 0) refreshTransferList(players, myTeamId);

    let allRes = [];
    let myMatch = null;

    if (currentEvent.type === 'LEAGUE') {
        schedules.forEach((leagueSchedule) => {
            if (leagueSchedule && leagueSchedule.length > 0) {
                const m = leagueSchedule[currentEvent.round - 1]; 
                if(m) {
                    m.forEach(match => {
                        const tA = teams.find(t => t.id === match.home); const tB = teams.find(t => t.id === match.away);
                        const res = simulateMatch(tA, tB, players, myTeamId, myFormation, managerData);
                        if (tA.id === myTeamId || tB.id === myTeamId) myMatch = res;
                        allRes.push({ ...res, teamAId: tA.id, teamBId: tB.id, compType: 'LEAGUE' });
                    });
                }
            }
        });
    } else if (currentEvent.type === 'CUP') {
        if(cupTeams.length >= 2) { 
            let remaining = [...cupTeams].sort(() => 0.5 - Math.random());
            for(let i=0; i<remaining.length; i+=2) {
                if(!remaining[i+1]) { 
                    allRes.push({ isBye: true, teamAId: remaining[i], compType: 'CUP' });
                    continue; 
                }
                const tA = teams.find(t => t.id === remaining[i]); const tB = teams.find(t => t.id === remaining[i+1]);
                if (tA && tB) {
                    const res = simulateMatch(tA, tB, players, myTeamId, myFormation, managerData);
                    if (tA.id === myTeamId || tB.id === myTeamId) myMatch = res;
                    allRes.push({ ...res, teamAId: tA.id, teamBId: tB.id, compType: 'CUP' });
                }
            }
        }
    } else if (currentEvent.type === 'CL') {
        if (clState.active && clState.teams && clState.teams.length >= 2) {
            let pairTeams = [...clState.teams];
            for(let i=0; i<pairTeams.length; i+=2) {
                const tA = teams.find(t => t.id === pairTeams[i]); const tB = teams.find(t => t.id === pairTeams[i+1]);
                if(tA && tB) {
                    const res = simulateMatch(tA, tB, players, myTeamId, myFormation, managerData);
                    if (tA.id === myTeamId || tB.id === myTeamId) myMatch = res;
                    allRes.push({ ...res, teamAId: tA.id, teamBId: tB.id, compType: 'CL' });
                }
            }
        }
    }

    setPendingUpdates(allRes); 
    
    if (myMatch) {
        setSimulationData(myMatch); 
        setSimulationTime(0); 
    } else {
        setSimulationData({ isDummy: true, title: currentEvent.name, results: allRes });
        setSimulationTime(90); 
    }
    setIsSimulating(true);
  };

  const finishWeekLogic = () => {
      setIsSimulating(false);
      let earnedXP = 0;
      if (!pendingUpdates) return;
      
      let newTeams = JSON.parse(JSON.stringify(teams)); 
      let newPlayers = players.map(p => ({ ...p, stats: { ...p.stats } })); 
      const currentEvent = activeCalendar[week - 1];
      newPlayers.forEach(p => { if (p.suspension > 0) p.suspension -= 1; });

      let forcedSales = [];
      let incomeFromRebels = 0;
      const myTeamPlayers = newPlayers.filter(p => p.teamId === myTeamId);
      const myAvgSkill = myTeamPlayers.reduce((s, p) => s + p.skill, 0) / (myTeamPlayers.length || 1);

      newPlayers.forEach(p => {
          if (p.morale === undefined) p.morale = 100;
          if (p.teamId === myTeamId) {
              if (p.isStarter) p.morale = Math.min(100, p.morale + 10); 
              else if (p.injury === 0 && p.suspension === 0) {
                  let moraleDrop = 3;
                  if (p.skill >= myAvgSkill + 2) moraleDrop = 15; else if (p.skill >= myAvgSkill - 3) moraleDrop = 8; 
                  const motivatorLevel = managerData?.skills?.motivator || 0;
                  if (motivatorLevel > 0) moraleDrop = Math.max(1, moraleDrop - (motivatorLevel * 3)); 
                  p.morale -= moraleDrop;
              }
              if (p.morale <= 0) {
                  if (p.loanedFrom) { p.teamId = p.loanedFrom; forcedSales.push(`➤ ${p.name} (Przerwał wypożyczenie)`); } 
                  else { const sellPrice = Math.floor(p.value * 0.3); incomeFromRebels += sellPrice; forcedSales.push(`➤ ${p.name} (Zarząd sprzedał buntownika)`); p.teamId = null; }
              }
          }
      });
      
      if (forcedSales.length > 0) {
          setBudget(b => b + incomeFromRebels); alert(`🚨 BUNT W SZATNI!\nOdeszli:\n${forcedSales.join('\n')}`);
      }
      
      let newSchedules = JSON.parse(JSON.stringify(schedules));
      const myTeamData = newTeams.find(t => t.id === myTeamId);
      
      let nextCupTeams = [];
      let nextClTeams = [];
      let clMatchesForHistory = [];
      let cupMatchesForHistory = [];

      pendingUpdates.forEach(res => {
          if (res.isBye) {
              if (res.compType === 'CUP') nextCupTeams.push(res.teamAId);
              return;
          }
          
          const tA = newTeams.find(t => String(t.id) === String(res.teamAId)); 
          const tB = newTeams.find(t => String(t.id) === String(res.teamBId));
          const winnerId = res.scoreA > res.scoreB ? tA.id : (res.scoreB > res.scoreA ? tB.id : (Math.random()>0.5 ? tA.id : tB.id));
          
          if (tA.id === myTeamId || tB.id === myTeamId) {
              earnedXP += res.scoreA > res.scoreB ? (tA.id === myTeamId ? 100 : 10) : (res.scoreA === res.scoreB ? 30 : (tB.id === myTeamId ? 100 : 10));
              const isWin = (tA.id === myTeamId && res.scoreA > res.scoreB) || (tB.id === myTeamId && res.scoreB > res.scoreA);
              const isDraw = res.scoreA === res.scoreB;
              setBoardConfidence(prev => {
                  let change = isWin ? 5 : isDraw ? 0 : -6;
                  if (myTeamData && myTeamData.league === 1) change = isWin ? 3 : isDraw ? -2 : -12; 
                  if (myTeamData && myTeamData.league === 3) change = isWin ? 6 : isDraw ? 2 : -4;   
                  return Math.max(0, Math.min(100, prev + change));
              });

              setLastResults(prev => [{ 
                  host: tA.name, guest: tB.name, scoreA: res.scoreA, scoreB: res.scoreB, events: res.events,
                  savesA: res.savesA, savesB: res.savesB, chancesA: res.chancesA, chancesB: res.chancesB,
                  foulsA: res.foulsA, foulsB: res.foulsB, cornersA: res.cornersA, cornersB: res.cornersB,
                  freeKicksA: res.freeKicksA, freeKicksB: res.freeKicksB, penaltiesA: res.penaltiesA, penaltiesB: res.penaltiesB
              }, ...prev].slice(0, 10));
          }

          if (res.compType === 'LEAGUE') {
              tA.played++; tA.goalsFor+=res.scoreA; tA.goalsAgainst+=res.scoreB; 
              tB.played++; tB.goalsFor+=res.scoreB; tB.goalsAgainst+=res.scoreA;
              if(res.scoreA > res.scoreB) { tA.points+=3; tA.won++; tB.lost++; } 
              else if(res.scoreA===res.scoreB) { tA.points++; tA.drawn++; tB.points++; tB.drawn++; } 
              else { tA.lost++; tB.points+=3; tB.won++; }
              
              const leagueIndex = (tA.league || 1) - 1;
              if (newSchedules[leagueIndex] && newSchedules[leagueIndex].length > 0) {
                  const roundMatches = newSchedules[leagueIndex][currentEvent.round - 1];
                  if (roundMatches) {
                      const matchInSchedule = roundMatches.find(m => 
                          (String(m.home) === String(tA.id) && String(m.away) === String(tB.id)) || (String(m.home) === String(tB.id) && String(m.away) === String(tA.id))
                      );
                      if (matchInSchedule) {
                          if (String(matchInSchedule.home) === String(tA.id)) { matchInSchedule.scoreHome = res.scoreA; matchInSchedule.scoreAway = res.scoreB; } 
                          else { matchInSchedule.scoreHome = res.scoreB; matchInSchedule.scoreAway = res.scoreA; }
                          matchInSchedule.isPlayed = true; 
                      }
                  }
              }
          } else if (res.compType === 'CUP') {
              nextCupTeams.push(winnerId);
              cupMatchesForHistory.push({ host: tA.name, guest: tB.name, hostId: tA.id, guestId: tB.id, scoreA: res.scoreA, scoreB: res.scoreB, winnerId, isPenalties: res.scoreA === res.scoreB });
          } else if (res.compType === 'CL') {
              nextClTeams.push(winnerId);
              clMatchesForHistory.push({ host: tA.name, guest: tB.name, hostId: tA.id, guestId: tB.id, scoreA: res.scoreA, scoreB: res.scoreB, winnerId, isPenalties: res.scoreA === res.scoreB });
          }

          res.events.forEach(ev => {
              if (ev.type === 'goal') {
                  if (ev.scorer && ev.scorer.id) {
                      const p = newPlayers.find(x => x.id === ev.scorer.id);
                      if (p) { p.goals = (p.goals || 0) + 1; p.form = Math.min(10, (p.form || 5) + 1.2); }
                  }
                  if (ev.assist && ev.assist.id) {
                      const a = newPlayers.find(x => x.id === ev.assist.id);
                      if (a) { a.assists = (a.assists || 0) + 1; a.form = Math.min(10, (a.form || 5) + 0.8); }
                  }
              } else if (ev.type === 'injury' && ev.player) {
                  const injured = newPlayers.find(x => x.id === ev.player.id);
                  if (injured) { injured.injury = ev.weeks; injured.form = Math.max(1, (injured.form || 5) - 2); }
              } else if (ev.type === 'yellow' && ev.player) {
                  const p = newPlayers.find(x => x.id === ev.player.id);
                  if (p) { p.yellowCards = (p.yellowCards || 0) + 1; if (p.yellowCards === 4 || (p.yellowCards > 4 && (p.yellowCards - 4) % 2 === 0)) p.suspension = (p.suspension || 0) + 1; }
              } else if (ev.type === 'red' && ev.player) {
                  const p = newPlayers.find(x => x.id === ev.player.id);
                  if (p) { p.redCards = (p.redCards || 0) + 1; p.suspension = (p.suspension || 0) + 1; }
              }
          });

          const teamAStarters = newPlayers.filter(p => String(p.teamId) === String(res.teamAId) && p.isStarter);
          const teamBStarters = newPlayers.filter(p => String(p.teamId) === String(res.teamBId) && p.isStarter);
          const updateDefenseForm = (squad, goalsConceded, saves) => {
              squad.forEach(p => {
                  if (p.position === 'BR' || p.position === 'OBR') {
                      let formChange = goalsConceded === 0 ? 1.2 : (goalsConceded >= 3 ? -1.0 : 0);
                      if (goalsConceded === 0) p.cleanSheets = (p.cleanSheets || 0) + 1; 
                      p.form = Math.min(10, Math.max(1, (p.form || 5) + formChange + (saves * 0.15)));
                  }
              });
          };
          updateDefenseForm(teamAStarters, res.scoreB, res.savesA); 
          updateDefenseForm(teamBStarters, res.scoreA, res.savesB);
      });

      if (cupMatchesForHistory.length > 0) {
          setCupTeams(nextCupTeams);
          setCupHistory(prev => [...prev, { round: currentEvent.name, matches: cupMatchesForHistory }]);
      }
      if (clMatchesForHistory.length > 0) {
          setClState(prev => ({ ...prev, teams: nextClTeams, history: [...prev.history, { round: currentEvent.name, matches: clMatchesForHistory }] }));
          if (currentEvent.name.includes('FINAŁ') && nextClTeams.length > 0) {
               const winner = newTeams.find(t => t.id === nextClTeams[0]);
               setNotifications(prev => [{text: `🏆 LIGA MISTRZÓW: ${winner.name} ZDOBYWA PUCHAR!`, value: 10000000}, ...prev]);
               if (winner && String(winner.id) === String(myTeamId)) setBudget(b => b + 10000000); 
          }
      }

      newPlayers.forEach(p => {
          if ((p.suspension > 0 || p.injury > 0) && p.isStarter) {
              p.isStarter = false;
              const teamBench = newPlayers.filter(x => x.teamId === p.teamId && !x.isStarter && (x.suspension || 0) === 0 && (x.injury || 0) === 0);
              let sub = teamBench.find(x => x.position === p.position) || teamBench[0];
              if (sub) sub.isStarter = true;
          }
          if (p.form > 5) p.form = Math.max(5, p.form - 0.2); else if (p.form < 5) p.form = Math.min(5, p.form + 0.2);
          if (p.injury > 0) p.injury -= 1;
          if (p.age <= 26 && p.injury === 0 && p.skill < p.potential && Math.random() < (p.isStarter ? 0.03 : 0.01)) {
              p.skill++; p.value = calculatePlayerValue(p.skill, p.potential, p.age);
          }
      });

      const myTeamPlayersForEvent = newPlayers.filter(p => String(p.teamId) === String(myTeamId));
      if (Math.random() < 0.20 && myTeamPlayersForEvent.length > 0) { 
          const randomPlayer = myTeamPlayersForEvent[Math.floor(Math.random() * myTeamPlayersForEvent.length)];
          const sortedBySkill = [...myTeamPlayersForEvent].sort((a,b) => b.skill - a.skill);
          const top3 = sortedBySkill.slice(0, 3);
          const starPlayer = top3[Math.floor(Math.random() * top3.length)] || randomPlayer; 
          const youngsters = myTeamPlayersForEvent.filter(p => p.age < 23);
          const youngPlayer = youngsters.length > 0 ? youngsters[Math.floor(Math.random() * youngsters.length)] : randomPlayer;
          const benchers = myTeamPlayersForEvent.filter(p => !p.isStarter);
          const benchPlayer = benchers.length > 0 ? benchers[Math.floor(Math.random() * benchers.length)] : randomPlayer;

          const possibleEvents = [
              { title: "Afera w klubie nocnym!", desc: `Jedna z Twoich największych gwiazd, ${starPlayer.name}, została przyłapana w klubie nocnym do 4 nad ranem przed meczem. Prasa domaga się kary!`, targetPlayerId: starPlayer.id, choices: [ { text: "Ukarz go grzywną", budgetChange: 50000, moraleChange: -30, boardChange: 5, logText: "Ukarano zawodnika. Zarząd pochwala dyscyplinę." }, { text: "Broń go w mediach", budgetChange: -30000, moraleChange: 15, boardChange: -5, logText: "Dział PR uciszył sprawę kosztem klubowej kasy." } ] },
              { title: "Szybki i wściekły", desc: `${starPlayer.name} został zatrzymany za jazdę 200 km/h w terenie zabudowanym. Grozi mu areszt i skandal wizerunkowy.`, targetPlayerId: starPlayer.id, choices: [ { text: "Opłać kaucję i prawników", budgetChange: -150000, moraleChange: 10, logText: "Prawnicy wyciągnęli piłkarza z aresztu." }, { text: "Zawieszenie w prawach", budgetChange: 0, suspensionChange: 2, boardChange: 10, logText: "Klub nałożył surowe zawieszenie. Zarząd jest zachwycony." } ] },
              { title: "Szantaż agenta", desc: `Agent piłkarza ${starPlayer.name} grozi, że jeśli nie wpłacisz mu "premii lojalnościowej" pod stołem, zawodnik natychmiast zażąda transferu!`, targetPlayerId: starPlayer.id, choices: [ { text: "Zapłać cwaniakowi", budgetChange: -200000, moraleChange: 20, logText: "Agent dostał pieniądze. Gwiazda zostaje w klubie." }, { text: "Nie negocjuję", budgetChange: 0, moraleChange: -40, boardChange: 5, logText: "Wyrzuciłeś agenta za drzwi. Piłkarz jest wściekły!" } ] },
              { title: "Niepokojący uraz...", desc: `Na treningu siłowym ${randomPlayer.name} zaczął narzekać na kłujący ból w kolanie. Lekarz klubowy nie wie co robić.`, targetPlayerId: randomPlayer.id, choices: [ { text: "Wyślij do Kliniki", budgetChange: -90000, injuryChange: 0, logText: "Specjaliści w klinice zażegnali kryzys." }, { text: "Dajcie mu lód", budgetChange: 0, injuryChange: 3, logText: "Zwykły uraz przerodził się w dłuższą kontuzję!" } ] },
              { title: "Zakażenie w szatni", desc: `Wielu graczy, w tym ${randomPlayer.name}, zgłasza objawy grypy żołądkowej. Szatnię opanował wirus!`, targetPlayerId: randomPlayer.id, choices: [ { text: "Dezynfekcja i leki", budgetChange: -120000, logText: "Prywatni medycy opanowali epidemię." }, { text: "Pijcie dużo wody", budgetChange: 0, injuryChange: 2, globalMoraleChange: -10, logText: "Epidemia uziemiła część składu." } ] },
              { title: "Młody gniewny", desc: `Młody talent, ${youngPlayer.name}, prosi o sfinansowanie dodatkowych treningów ze specjalistą.`, targetPlayerId: youngPlayer.id, choices: [ { text: "Zainwestuj w młodzika", budgetChange: -60000, potentialChange: 2, moraleChange: 15, logText: "Młody talent dostał trenera. Potencjał wzrósł!" }, { text: "Musi trenować z zespołem", budgetChange: 0, moraleChange: -15, logText: "Odmówiono specjalnego traktowania." } ] }
          ];

          const chosenEvent = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
          setActiveEvent(chosenEvent);
      } else {
          if(Math.random() > 0.8) {
              const evs = [{t:"Dzień sponsora",v:50000}, {t:"Zysk z biletów",v:20000}, {t:"Bonus od ligi",v:15000}];
              const ev = evs[Math.floor(Math.random()*evs.length)];
              setBudget(prev => prev + ev.v); 
              setNotifications(prev => [{text: ev.t, value: ev.v}, ...prev]);
          }
      }

      setTeams(newTeams); setPlayers(newPlayers); setSchedules(newSchedules); setWeek(p => p+1); 
      
      if (earnedXP > 0) {
          setManagerData(prev => {
              let temp = { ...prev }; temp.xp += earnedXP;
              while (temp.xp >= temp.level * 500) { temp.xp -= temp.level * 500; temp.level++; temp.sp++; }
              return temp;
          });
      }
      
      if (boardConfidence <= 0) { alert("🚨 ZWOLNIONY!"); setMyTeamId(null); setAppMode('MENU'); }
      if (infrastructure && infrastructure.stadium > 1) {
          setBudget(b => b + ((infrastructure.stadium - 1) * 40000));
      }
      setPendingUpdates(null);
  };

  const startNewSeason = () => {
    try {
      const myTeamNow = teams.find(t => t.id === myTeamId);
      if (!myTeamNow) return;

      const myLeagueTeamsTest = teams.filter(t => t.league === myTeamNow.league && t.country === myTeamNow.country).sort((a, b) => b.points - a.points);
      const myPositionTest = myLeagueTeamsTest.findIndex(t => t.id === myTeamId) + 1;

      // --- CELE ZARZĄDU I KONTRAKTY NA KONIEC SEZONU ---
      let isFired = false;
      let contractExpired = false;
      const currentContract = managerData.contract;
      let expectedPos = currentContract ? currentContract.expectedPos : (myTeamNow.league === 1 ? 4 : myTeamNow.league === 2 ? 8 : 14);

      if (myPositionTest > expectedPos + 3 || boardConfidence < 25) {
          isFired = true; 
      }

      let logs = [];
      if (currentContract && seasonNum >= currentContract.expirySeason && !isFired) {
          if (myPositionTest <= expectedPos) {
              logs.push(`📝 KONTRAKT: Zarząd jest zachwycony Twoją pracą! Umowa przedłużona o 2 lata.`);
              setManagerData(prev => ({
                  ...prev,
                  contract: { ...prev.contract, expirySeason: prev.contract.expirySeason + 2 }
              }));
          } else {
              contractExpired = true; 
          }
      }
      
      const myCurrentSquad = players.filter(p => p.teamId === myTeamId);
      const totalWageBill = myCurrentSquad.reduce((sum, p) => sum + (p.wage || 0), 0);
      
      let prizeMoney = 0;
      if (myTeamNow.league === 1) prizeMoney = Math.max(500000, 15000000 - ((myPositionTest - 1) * 800000));
      else if (myTeamNow.league === 2) prizeMoney = Math.max(100000, 3000000 - ((myPositionTest - 1) * 150000));
      else prizeMoney = Math.max(20000, 500000 - ((myPositionTest - 1) * 25000));

      const currentOVR = calculateTeamOVR(myTeamId, players);
      const sponsorMoney = calculateDynamicBudget({ ...myTeamNow, attack: currentOVR, defense: currentOVR, league: myTeamNow.league }) * 0.4;
      const totalIncome = Math.floor(prizeMoney + sponsorMoney);
      
      let projectedBudget = budget + totalIncome - totalWageBill;

      if (projectedBudget < 0) {
          if (myCurrentSquad.length <= 12) {
              alert(`⚠️ KRYZYS FINANSOWY KLUBU!\n\nJesteś zadłużony, zarząd zaciągnął pożyczkę ratunkową. Twój budżet: 0 €.`);
              projectedBudget = 0;
          } else {
              alert(`❌ WIDMO BANKRUCTWA!\n\nZarząd zablokował start rozgrywek! Nie stać Cię na wypłacenie pensji.\nSprzedaj kogoś, aby uregulować długi!`);
              setCurrentView('squad'); 
              return; 
          }
      }

      let nextTeams = JSON.parse(JSON.stringify(teams)); 
      let loanReturnsLog = [];

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
              for (let i = 0; i < 16; i++) finalDrawIds.push(pot1[i].id, pot2[i].id);
          }
          setClState({ active: true, phase: 'ro32', teams: finalDrawIds, waiting: [], matches: [], history: [] });
      } else {
          setClState({ active: false, phase: '', teams: [], matches: [], history: [] });
      }

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
            }
          }
        }
      });

      promotions.forEach(p => {
        const team = nextTeams.find(t => t.id === p.id);
        if (team) team.league = p.toLeague;
      });

      const currentWorldPlayers = [...players];
      const goldenBoot = currentWorldPlayers.sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];
      const gks = currentWorldPlayers.filter(p => p.position === 'BR');
      const goldenGlove = gks.sort((a, b) => (b.cleanSheets || 0) - (a.cleanSheets || 0) || (b.form || 0) - (a.form || 0))[0];
      const ballonDor = currentWorldPlayers.sort((a, b) => {
          const scoreA = (a.goals || 0)*4 + (a.assists || 0)*2 + (a.cleanSheets || 0)*3 + (a.form || 5)*5 + a.skill;
          const scoreB = (b.goals || 0)*4 + (b.assists || 0)*2 + (b.cleanSheets || 0)*3 + (b.form || 5)*5 + b.skill;
          return scoreB - scoreA;
      })[0];

      setHallOfFame(prev => [{
          season: seasonNum,
          ballonDor: { id: ballonDor.id, name: ballonDor.name, club: nextTeams.find(t=>t.id===ballonDor.teamId)?.name || 'Wolny Agent', stat: `${ballonDor.goals||0} Goli, ${ballonDor.assists||0} Asyst`, nation: ballonDor.nation?.code },
          goldenBoot: { id: goldenBoot.id, name: goldenBoot.name, club: nextTeams.find(t=>t.id===goldenBoot.teamId)?.name || 'Wolny Agent', stat: `${goldenBoot.goals||0} Goli`, nation: goldenBoot.nation?.code },
          goldenGlove: { id: goldenGlove.id, name: goldenGlove.name, club: nextTeams.find(t=>t.id===goldenGlove.teamId)?.name || 'Wolny Agent', stat: `${goldenGlove.cleanSheets||0} Czystych kont`, nation: goldenGlove.nation?.code }
      }, ...prev]);

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

        if (newP.id === ballonDor.id) { newP.skill = Math.min(99, newP.skill + 2); newP.potential = Math.max(newP.potential, newP.skill + 1); }
        if (newP.id === goldenBoot.id && newP.stats) newP.stats.shooting = Math.min(99, newP.stats.shooting + 3);
        if (newP.id === goldenGlove.id && newP.stats) newP.stats.defense = Math.min(99, newP.stats.defense + 3);

        newP.age += 1;
        newP.goals = 0;
        newP.assists = 0;
        newP.cleanSheets = 0; 
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

      let sponsorBonus = 0;
      let sponsorLog = "Sponsor: Kontrakt podstawowy, brak celu.";
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

      projectedBudget += sponsorBonus; 
      setBudget(projectedBudget);
      
      let budgetMsg = `PODSUMOWANIE FINANSÓW:\nMiejsce w lidze: ${myPositionTest}\nNagroda ligowa: ${formatMoney(prizeMoney)}\nBaza od zarządu: ${formatMoney(sponsorMoney)}\nPremia z kontraktu: ${formatMoney(sponsorBonus)}\nZapłacone pensje: -${formatMoney(totalWageBill)}\nDOSTĘPNY BUDŻET NA START: ${formatMoney(projectedBudget)}\n${sponsorLog}`;

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
      setActiveSponsor(null); 
      setShowSponsorModal(true); 

      if (isFired) {
          setMyTeamId(null);
          setBoardConfidence(100);
          setManagerData(prev => ({ ...prev, contract: null }));
          setAppMode('MENU');
          alert(`❌ ZWOLNIENIE DYSCYPLINARNE!\n\nZarząd stracił do Ciebie cierpliwość. Oczekiwano miejsca w TOP ${expectedPos}, a zająłeś ${myPositionTest} miejsce. Lądujesz na bezrobociu!`);
      } else if (contractExpired) {
          setMyTeamId(null);
          setBoardConfidence(100);
          setManagerData(prev => ({ ...prev, contract: null }));
          setAppMode('MENU');
          alert(`⌛ KONIEC KONTRAKTU!\n\nTwoja umowa dobiegła końca. Nie zrealizowałeś celu zarządu (TOP ${expectedPos}), więc nie zaoferowano Ci przedłużenia.`);
      } else {
          alert(`Nowy sezon! \n\n${budgetMsg}\n\n${loanReturnsLog.length > 0 ? "Powroty: " + loanReturnsLog.length : ""}\n${logs.join('\n')}`);
      }
    } catch (error) {
      console.error("Błąd podczas nowego sezonu:", error);
      alert("Wystąpił błąd podczas generowania nowego sezonu. Sprawdź konsolę (F12).");
    }
  };

  if (appMode === 'MENU') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100">
              <div className="absolute inset-0 bg-[#0f172a] z-0">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518605368461-1e1e38ce8058?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 filter blur-sm scale-105 animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/50 via-[#0f172a]/80 to-[#0f172a]"></div>
              </div>
              
              <div className="relative z-10 flex flex-col items-center mb-12">
                  <div className="w-28 h-28 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-3xl flex items-center justify-center font-display font-black text-white text-5xl shadow-[0_0_40px_rgba(6,182,212,0.6)] mb-6 border-b-4 border-white/30 transform hover:scale-105 transition-transform cursor-default">
                      PM
                  </div>
                  <h1 className="font-display text-6xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-2xl text-center">
                      POLISH <span className="text-cyan-500">MANAGER</span>
                  </h1>
                  <div className="mt-4 px-4 py-1 border border-cyan-500/30 rounded-full bg-cyan-900/20 text-cyan-400 text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                      Sezon 2026 / Engine v2.0
                  </div>
              </div>

              <div className="relative z-10 w-full max-w-2xl space-y-4">
                  <h2 className="text-center text-slate-500 font-bold uppercase tracking-widest mb-6 text-sm">Wybierz Profil Menedżera</h2>
                  
                  {[1, 2, 3].map(slot => {
                      const info = getSaveInfo(slot);
                      return (
                          <div key={slot} className="flex gap-3 h-32 md:h-28">
                              {info.exists ? (
                                  <>
                                      <button onClick={() => loadGame(slot)} className="flex-1 bg-[#1e293b] border border-slate-700 hover:border-cyan-500/50 rounded-2xl p-5 flex items-center justify-between transition-all group hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:-translate-y-1 text-left">
                                          <div className="flex flex-col">
                                              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-cyan-400 transition-colors">Kariera {slot}</div>
                                              <div className="text-2xl md:text-3xl font-black text-white truncate drop-shadow-md">{info.teamName}</div>
                                              <div className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-4">
                                                  <span className="bg-[#0f172a] px-2 py-0.5 rounded text-white border border-slate-700">📅 Sezon {info.season}</span>
                                                  <span className="text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30 shadow-inner">💰 {formatMoney(info.budget)}</span>
                                              </div>
                                          </div>
                                          <div className="text-4xl opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-2 text-cyan-400">▶</div>
                                      </button>
                                      <button onClick={() => deleteSave(slot)} className="w-16 md:w-20 bg-red-900/20 border border-red-900/50 hover:bg-red-600 hover:border-red-500 rounded-2xl flex items-center justify-center text-2xl md:text-3xl transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] group" title="Skasuj zapis">
                                          <span className="group-hover:scale-125 transition-transform">🗑️</span>
                                      </button>
                                  </>
                              ) : (
                                  <button onClick={() => handleNewGameClick(slot)} className="flex-1 bg-[#1e293b]/50 border border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-900/10 rounded-2xl p-5 flex items-center justify-center transition-all group hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                                      <div className="text-center">
                                          <div className="text-xl md:text-2xl font-black text-slate-500 group-hover:text-cyan-400 transition-colors flex items-center justify-center gap-3">
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

  if (appMode === 'TEAM_SELECT') {
      return (
          <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100 animate-fade-in">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/10 via-[#0f172a] to-[#0f172a] pointer-events-none"></div>
              
              <div className="relative z-10 w-full max-w-4xl bg-[#1e293b] p-8 md:p-12 rounded-3xl border border-slate-700 shadow-2xl">
                  <h2 className="text-3xl md:text-5xl font-black text-center italic tracking-tight mb-10 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                      {teams.length === 0 ? "WYBIERZ KRAJ" : "WYBIERZ SWÓJ KLUB"}
                  </h2>

                  {teams.length === 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                          {[ { code: 'GB-ENG', name: 'Anglia' }, { code: 'ES', name: 'Hiszpania' }, { code: 'IT', name: 'Włochy' }, { code: 'DE', name: 'Niemcy' }, { code: 'FR', name: 'Francja' }, { code: 'PL', name: 'Polska' }].map(c => (
                              <button key={c.code} onClick={() => handleCountrySelect(c.code)} className="bg-[#0f172a] hover:bg-gradient-to-br hover:from-cyan-600 hover:to-blue-600 border border-slate-700 hover:border-cyan-400 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] group">
                                  <div className="text-4xl shadow-lg rounded-full group-hover:scale-110 transition-transform"><FlagIcon code={c.code} size="xl" /></div>
                                  <span className="font-black tracking-widest uppercase text-sm md:text-base group-hover:text-white text-slate-300">{c.name}</span>
                              </button>
                          ))}
                      </div>
                  ) : (
                      <div className="space-y-8 animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
                              {teams.map(t => (
                                  <button key={t.id} onClick={() => handleTeamSelect(t.id)} className="bg-[#0f172a] hover:bg-gradient-to-r hover:from-emerald-600 hover:to-teal-600 border border-slate-700 hover:border-emerald-400 rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(16,185,129,0.3)] group">
                                      <div className="text-lg font-black truncate w-full text-center group-hover:text-white text-slate-200">{t.name}</div>
                                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-[#1e293b] px-3 py-1.5 rounded-lg border border-slate-700">
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
  if (appMode === 'EXIT') return <div className="h-screen bg-[#0f172a] flex items-center justify-center text-white flex-col"><h1 className="text-4xl mb-4 font-black">Dzięki za grę!</h1><button onClick={() => setAppMode('MENU')} className="text-cyan-400 font-bold">Wróć</button></div>;
  if (appMode === 'CONTRACT' && pendingContractTeam) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#0f172a] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] p-6">
              <ManagerContractModal 
                  team={pendingContractTeam}
                  managerData={managerData}
                  formatMoney={formatMoney}
                  onDecline={() => {
                      setPendingContractTeam(null);
                      setAppMode('SELECT'); // Odrzucasz umowę? Wracasz do wyboru klubu
                  }}
                  onAccept={(contractDetails) => {
                      setManagerData(prev => ({
                          ...prev,
                          contract: {
                              ...contractDetails,
                              startSeason: seasonNum,
                              expirySeason: seasonNum + contractDetails.years
                          }
                      }));
                      
                      // Akceptacja = startujemy grę!
                      setMyTeamId(pendingContractTeam.id); 
                      setActiveLeagueTab(pendingContractTeam.league);
                      setBudget(calculateDynamicBudget(pendingContractTeam));
                      setPendingContractTeam(null);
                      setShowSponsorModal(true); 
                      refreshTransferList(players, pendingContractTeam.id);
                      setAppMode('GAME');
                  }}
              />
          </div>
      );
  }
  if (appMode === 'SELECT') {
      const filteredTeams = teams.filter(t => t.country === userCountryCode);
      if (filteredTeams.length === 0) {
          return (
              <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white">
                  <h2 className="text-xl text-red-500 font-bold">Błąd: Brak klubów do wyświetlenia.</h2>
                  <button onClick={() => setAppMode('MENU')} className="mt-4 bg-white text-black px-4 py-2 rounded">Wróć do Menu</button>
              </div>
          );
      }
      return <TeamSelectionScreen teams={filteredTeams} onSelect={handleTeamSelect} onBack={() => setAppMode('COUNTRY_SELECT')} />;
  }
  if (isSimulating && simulationData) return <MatchSimulationView matchData={simulationData} timer={simulationTime} teamA={simulationData.teamA} teamB={simulationData.teamB} onFinish={finishWeekLogic} />;

  const myTeam = teams.find(t => String(t.id) === String(myTeamId));
  const mySquad = players.filter(p => String(p.teamId) === String(myTeamId));

  let nextOpponent = null;
  let nextMatchText = "PRZERWA";
  let isAway = false;
  let eventName = "PRZERWA";

  const currentEvent = activeCalendar[week - 1];

  if (myTeam && schedules.length > 0 && currentEvent) {
      eventName = currentEvent.name;
      if (currentEvent.type === 'LEAGUE') {
          const leagueIndex = (myTeam.league || 1) - 1;
          const currentLeagueSchedule = schedules[leagueIndex];
          if (currentLeagueSchedule) {
              const currentRoundMatches = currentLeagueSchedule[week - 1];
              if (currentRoundMatches) {
                  const match = currentRoundMatches.find(m => String(m.home) === String(myTeamId) || String(m.away) === String(myTeamId));
                  if (match) {
                      isAway = String(match.away) === String(myTeamId);
                      const opponentId = isAway ? match.home : match.away;
                      nextOpponent = teams.find(t => String(t.id) === String(opponentId)); 
                      nextMatchText = isAway ? "WYJAZD" : "DOM";
                  }
              } else {
                  eventName = "PRZERWA (Koniec Ligi)";
              }
          }
      } else if (currentEvent.type === 'CUP') {
          if (!cupTeams.includes(myTeamId)) eventName += " (Odpadłeś)";
          else nextOpponent = { id: 'draw', name: 'Losowanie na żywo...', country: 'PL' };
      } else if (currentEvent.type === 'CL') {
          if (!clState.teams || !clState.teams.includes(myTeamId)) eventName += " (Brak Awansu / Odpadłeś)";
          else nextOpponent = { id: 'draw', name: 'Losowanie na żywo...', country: 'EU' };
      }
  } else if (week > 57) {
      eventName = "KONIEC SEZONU";
  }

  const renderView = () => {
      switch(currentView) {
          case 'table': return <MultiLeagueTable teams={teams} activeTab={activeLeagueTab} setTab={setActiveLeagueTab} myTeam={myTeam} />;
          case 'cup': return <CupView history={cupHistory} myTeamId={myTeamId} />;
          case 'cl': return <ChampionsLeagueView clState={clState} myTeamId={myTeamId} />;
          case 'world': return <WorldTablesView teams={teams} />;
          case 'schedule': return <ScheduleView schedules={schedules} teams={teams} myTeamId={myTeamId} currentWeek={week} calendar={activeCalendar} />;
          case 'scorers': return <TopScorers players={players} teams={teams} />;
          case 'manager': return <ManagerProfileView managerData={managerData} setManagerData={setManagerData} />;
          case 'infrastructure': return <InfrastructureView infrastructure={infrastructure} setInfrastructure={setInfrastructure} budget={budget} setBudget={setBudget} />;
          case 'squad': return <SquadVisuals players={mySquad} openPlayerModal={setSelectedPlayerForDetails} swapSourceId={swapSourceId} onSwap={handleSwapRequest} onBuyOption={triggerBuyOption} onSell={sellOwnPlayer} myFormation={myFormation} setMyFormation={setMyFormation} />;
          case 'history': return <HistoryView history={seasonHistory} />;
          case 'hof': return <HallOfFameView hallOfFame={hallOfFame} />;
          case 'academy': return <AcademyView academy={academy} budget={budget} onScout={sendScout} onPromote={promoteJunior} onFire={fireJunior} />;
          case 'transfers': return <TransferMarketView transferList={transferList} budget={budget} onTransfer={executeTransfer} managerData={managerData} />;
          default: return <Dashboard myTeam={myTeam} week={week} onPlayGame={startWeekSimulation} lastResults={lastResults} maxWeeks={57} onNewSeason={startNewSeason} notifications={notifications} eventName={eventName} nextOpponent={nextOpponent} isAway={isAway} activeSponsor={activeSponsor} />;
      }
  };

  return (
    <div className="h-screen w-full flex bg-[#0f172a] text-slate-100 overflow-hidden font-sans">
      
      {/* MODALE */}
      {pendingContractTeam && (
          <ManagerContractModal 
              team={pendingContractTeam}
              managerData={managerData}
              formatMoney={formatMoney}
              onDecline={() => setPendingContractTeam(null)}
              onAccept={(contractDetails) => {
                  setManagerData(prev => ({
                      ...prev,
                      contract: {
                          ...contractDetails,
                          startSeason: seasonNum,
                          expirySeason: seasonNum + contractDetails.years
                      }
                  }));
                  setMyTeamId(pendingContractTeam.id); 
                  setActiveLeagueTab(pendingContractTeam.league);
                  setBudget(calculateDynamicBudget(pendingContractTeam));
                  setPendingContractTeam(null);
                  setShowSponsorModal(true); 
                  refreshTransferList(players, pendingContractTeam.id);
                  setAppMode('GAME');
              }}
          />
      )}
        
      {selectedPlayerForDetails && <PlayerDetailModal player={selectedPlayerForDetails} onClose={() => setSelectedPlayerForDetails(null)} onSwap={() => handleSwapRequest(selectedPlayerForDetails.id)} swapSourceId={swapSourceId} onSell={() => sellOwnPlayer(selectedPlayerForDetails)} onBuyOption={() => triggerBuyOption(selectedPlayerForDetails)} managerData={managerData} />}
      {activeEvent && <StoryEventModal event={activeEvent} onResolve={handleResolveEvent} budget={budget} />}
      {showSponsorModal && myTeam && <SponsorSelectionModal team={myTeam} onSelect={(sponsor) => { setActiveSponsor(sponsor); setBudget(b => b + sponsor.upfrontAmount); setShowSponsorModal(false); }} />}
      {!managerData?.profile && myTeamId && <ManagerSelectionModal onSelect={(profile) => { setManagerData(prev => ({ ...prev, profile: profile })); setNotifications(prev => [{text: `Zatrudniono: ${profile.name}`, value: 0}, ...prev]); }} />}
      {negotiation && <TransferNegotiationModal player={negotiation.player} sellerTeam={negotiation.sellerTeam} budget={budget} managerData={managerData} onSuccess={(finalPrice) => { setBudget(b => b - finalPrice); setPlayers(prev => prev.map(p => p.id === negotiation.player.id ? { ...p, teamId: myTeamId, isStarter: false } : p)); setNotifications(prev => [{text: `Sukces! Podpisano kontrakt z ${negotiation.player.name}`, value: -finalPrice}, ...prev]); setNegotiation(null); }} onCancel={() => setNegotiation(null)} />}

      {/* LEWY PASEK BOCZNY - ZABLOKOWANY */}
      <aside className="w-72 bg-[#1e293b] border-r border-slate-700 flex flex-col shrink-0 shadow-2xl z-20 h-full">
          
          <div className="p-5 border-b border-slate-700 bg-[#0f172a]">
              <h2 className="text-2xl font-black text-white tracking-wider flex items-center gap-2">
                  <span className="text-cyan-500">PM</span> 2026
              </h2>
              <p className="text-xs text-cyan-400 mt-1 uppercase tracking-widest font-bold truncate">
                  {myTeam ? myTeam.name : "Twój Klub"}
              </p>
          </div>

          {myTeam && (
          <div className="p-4 border-b border-slate-700 bg-[#1e293b] space-y-4">
              <div className="flex justify-between items-center text-sm font-bold bg-[#0f172a] p-2.5 rounded-lg border border-slate-700 shadow-inner">
                  <span className="text-slate-400 flex items-center gap-2"><span>💰</span> Budżet:</span>
                  <span className="text-emerald-400">{formatMoney(budget)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold bg-[#0f172a] p-2.5 rounded-lg border border-slate-700 shadow-inner">
                  <span className="text-slate-400 flex items-center gap-2"><span>📅</span> Tydzień:</span>
                  <span className="text-amber-400">{week} / {activeCalendar.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold bg-[#0f172a] p-2.5 rounded-lg border border-slate-700 shadow-inner">
                  <span className="text-slate-400 flex items-center gap-2"><span>📈</span> Poparcie:</span>
                  <span className={`${boardConfidence > 50 ? 'text-emerald-400' : 'text-red-400'}`}>{boardConfidence}%</span>
              </div>
              <button 
                  onClick={week > activeCalendar.length ? startNewSeason : startWeekSimulation} 
                  className="w-full py-3.5 mt-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black uppercase tracking-widest text-[11px] shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all transform hover:-translate-y-1 flex justify-center items-center gap-2"
              >
                  <span>{week > activeCalendar.length ? "🔄" : "▶"}</span> {week > activeCalendar.length ? "Nowy Sezon" : "Kontynuuj Gry"}
              </button>
          </div>
          )}

          <div className="grid grid-cols-3 gap-1 p-3 bg-[#0f172a] border-b border-slate-700 shrink-0">
              {['Klub', 'Rozgrywki', 'Biuro'].map(tab => (
                  <button 
                      key={tab} 
                      onClick={() => setActiveMainTab(tab)} 
                      className={`py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-colors ${
                          activeMainTab === tab 
                          ? 'bg-cyan-600 text-white shadow-sm' 
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                      {tab}
                  </button>
              ))}
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
              {activeMainTab === 'Klub' && (
                  <div className="animate-fade-in-up space-y-2">
                      <MenuButton icon="🏠" label="Centrala" active={currentView==='dashboard'} onClick={()=>setCurrentView('dashboard')} />
                      <MenuButton icon="🛡️" label="Skład i Taktyka" active={currentView==='squad'} onClick={()=>setCurrentView('squad')} />
                      <MenuButton icon="🎓" label="Akademia" active={currentView==='academy'} onClick={()=>setCurrentView('academy')} />
                      <MenuButton icon="🏗️" label="Infrastruktura" active={currentView==='infrastructure'} onClick={()=>setCurrentView('infrastructure')} />
                  </div>
              )}
              {activeMainTab === 'Rozgrywki' && (
                  <div className="animate-fade-in-up space-y-2">
                      <MenuButton icon="📅" label="Terminarz" active={currentView==='schedule'} onClick={()=>setCurrentView('schedule')} />
                      <MenuButton icon="🏆" label="Liga Krajowa" active={currentView==='table'} onClick={()=>setCurrentView('table')} />
                      <MenuButton icon="🏆" label="Puchar Krajowy" active={currentView==='cup'} onClick={()=>setCurrentView('cup')} />
                      <MenuButton icon="⭐" label="Liga Mistrzów" active={currentView==='cl'} onClick={()=>setCurrentView('cl')} />
                      <MenuButton icon="🌍" label="Ligi Świata" active={currentView==='world'} onClick={()=>setCurrentView('world')} />
                  </div>
              )}
              {activeMainTab === 'Biuro' && (
                  <div className="animate-fade-in-up space-y-2">
                      <MenuButton icon="💸" label="Rynek Transferowy" active={currentView==='transfers'} onClick={()=>setCurrentView('transfers')} />
                      <MenuButton icon="⚽" label="Top Strzelcy" active={currentView==='scorers'} onClick={()=>setCurrentView('scorers')} />
                      <MenuButton icon="👔" label="Profil Menedżera" active={currentView==='manager'} onClick={()=>setCurrentView('manager')} />
                      <MenuButton icon="🌟" label="Sala Chwały" active={currentView==='hof'} onClick={()=>setCurrentView('hof')} />
                      <MenuButton icon="📜" label="Historia Kariery" active={currentView==='history'} onClick={()=>setCurrentView('history')} />
                  </div>
              )}
          </nav>

          <div className="p-4 border-t border-slate-700 bg-[#1e293b] shrink-0 space-y-3 z-30">
              <button onClick={saveGame} className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-md flex items-center justify-center gap-2">
                  <span className="text-lg">💾</span> Zapisz
              </button>
              <div className="flex gap-2">
                  <button onClick={() => setIsMuted(!isMuted)} className={`flex-1 py-3 rounded-xl transition-colors flex items-center justify-center text-xl font-bold border ${isMuted ? 'bg-[#0f172a] text-red-400 border-red-500/50 hover:bg-red-900/30' : 'bg-[#0f172a] text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'}`}>
                      {isMuted ? "🔇" : "🔊"}
                  </button>
                  <button onClick={() => setAppMode('MENU')} className="flex-1 py-3 bg-red-600 text-white hover:bg-red-500 font-bold text-[11px] uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">
                      Wyjdź ➔
                  </button>
              </div>
          </div>
      </aside>

      {/* GŁÓWNA ZAWARTOŚĆ (PRAWA STRONA) */}
      <main className="flex-1 h-full overflow-y-auto bg-[#0f172a] p-6 lg:p-10 custom-scrollbar relative">
          <div className="max-w-[1600px] w-full mx-auto pb-12">
               {renderView()}
          </div>
      </main>

    </div>
  );
}

// --- WIDOKI ---

const MenuButton = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 border ${
            active 
            ? 'bg-cyan-600 text-white border-cyan-500 shadow-md translate-x-1' 
            : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white hover:border-slate-600 hover:translate-x-1'
        }`}
    >
        <span className="text-xl">{icon}</span>
        <span className="tracking-wide">{label}</span>
    </button>
);

const CountrySelectionScreen = ({ onSelect, onBack }) => {
    const countries = [{ code: 'PL', name: 'Polska' }, { code: 'GB-ENG', name: 'Anglia' }, { code: 'ES', name: 'Hiszpania' }, {code: 'FR', name:'Francja'} ,{ code: 'IT', name: 'Włochy' }, {code: 'DE', name: 'Niemcy'}];
    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8">
             <button onClick={onBack} className="absolute top-8 left-8 text-slate-400 hover:text-white font-bold flex items-center gap-2 transition-colors">
                <span className="text-xl">←</span> Wróć do Menu
             </button>
             
             <div className="text-center mb-12 animate-fade-in-up">
                 <h2 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">WYBIERZ LIGĘ</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                 {countries.map(c => (
                     <button 
                        key={c.code} 
                        onClick={() => onSelect(c.code)} 
                        className="group relative bg-[#1e293b] overflow-hidden rounded-3xl border border-slate-700 hover:border-cyan-500 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:-translate-y-2 aspect-video flex flex-col items-center justify-center"
                     >
                         <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-500">
                             <FlagIcon code={c.code === 'IT' ? 'IT' : c.code} size="xl" />
                         </div>
                         <h3 className="relative z-10 text-3xl font-black text-white mt-4 uppercase tracking-wider group-hover:text-cyan-300 transition-colors">
                             {c.name}
                         </h3>
                     </button>
                 ))}
             </div>
        </div>
    );
};

const TeamSelectionScreen = ({ teams, onSelect, onBack }) => {
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
                        className="relative overflow-hidden group bg-[#1e293b] hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 transition-all duration-300 rounded-xl p-4 text-left shadow-lg hover:-translate-y-1"
                    >
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-lg text-white group-hover:text-cyan-300 transition-colors">{t.name}</div>
                                <div className="text-xs text-slate-400 mt-1">Siła: <span className="text-white font-mono">{Math.round((t.attack+t.defense)/2)}</span></div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#0f172a] flex items-center justify-center font-bold text-slate-500 group-hover:text-white group-hover:bg-cyan-600 transition-all border border-slate-700">
                                {Math.round((t.attack+t.defense)/2)}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col p-8">
            <div className="max-w-7xl mx-auto w-full">
                <div className="flex items-center justify-between mb-12">
                    <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 bg-[#1e293b] hover:bg-slate-800 text-slate-300 hover:text-white rounded-full font-bold transition shadow-lg border border-slate-700 hover:border-white">
                        <span>←</span> Zmień Kraj
                    </button>
                    <div className="text-right">
                        <h1 className="text-4xl md:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 tracking-tighter">WYBIERZ KLUB</h1>
                    </div>
                </div>

                <div className="pb-20">
                    {league1.length > 0 && renderLeagueSection("Liga 1", league1, "border-cyan-500 text-cyan-400")}
                    {league2.length > 0 && renderLeagueSection("Liga 2", league2, "border-emerald-500 text-emerald-400")}
                    {league3.length > 0 && renderLeagueSection("Liga 3", league3, "border-blue-500 text-blue-400")}
                </div>
            </div>
        </div>
    );
};

const MatchSimulationView = ({ matchData, timer, teamA, teamB, onFinish }) => {
    if (matchData.isDummy) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start bg-[#0f172a] font-sans text-white p-6 md:p-12 overflow-y-auto custom-scrollbar">
                 <div className="mt-4 mb-4 text-5xl relative z-10 animate-bounce">🌍</div>
                 <h2 className="text-3xl md:text-5xl font-black mb-2 text-center text-white italic tracking-tighter relative z-10">{matchData.title}</h2>
                 <p className="text-slate-400 mb-8 text-center text-lg relative z-10 font-medium">Wyniki spotkań na innych stadionach:</p>
                 
                 <div className="relative z-10 w-full max-w-3xl space-y-3 mb-10">
                     {matchData.results && matchData.results.length > 0 ? (
                         matchData.results.map((res, idx) => {
                             if (res.isBye) {
                                 return (
                                     <div key={idx} className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 flex justify-center text-slate-500 font-bold shadow-sm">
                                         Wolny los (Awans bez gry)
                                     </div>
                                 );
                             }
                             return (
                                 <div key={idx} className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 flex justify-between items-center shadow-lg transition-transform hover:scale-[1.01]">
                                     <div className="flex-1 text-right font-bold text-slate-300 truncate pr-4 text-sm md:text-base">{res.teamA?.name || 'Drużyna A'}</div>
                                     <div className="px-4 py-1.5 bg-[#0f172a] rounded-xl border border-slate-700 font-mono font-black text-lg text-white shadow-inner flex items-center gap-2">
                                         <span>{res.scoreA}</span><span className="text-slate-600">:</span><span>{res.scoreB}</span>
                                     </div>
                                     <div className="flex-1 text-left font-bold text-slate-300 truncate pl-4 text-sm md:text-base">{res.teamB?.name || 'Drużyna B'}</div>
                                 </div>
                             );
                         })
                     ) : (
                         <div className="text-center text-slate-500 py-10 bg-[#1e293b] rounded-2xl border border-slate-700">Brak spotkań w tej rundzie.</div>
                     )}
                 </div>

                 <button onClick={onFinish} className="relative z-10 bg-cyan-600 text-white px-12 py-5 rounded-full font-black text-xl tracking-widest uppercase transition-all hover:bg-cyan-500 shadow-md mb-10 shrink-0 flex gap-3 items-center">
                     <span>Koniec Dnia</span><span>➔</span>
                 </button>
            </div>
        );
    }

    const evs = matchData.events.filter(e => e.minute <= timer);
    const scoreA = evs.filter(e => e.team === 'home' && (!e.type || e.type === 'goal')).length;
    const scoreB = evs.filter(e => e.team === 'away' && (!e.type || e.type === 'goal')).length;
    
    const scrollRef = useRef(null);
    useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [evs]);

    const progress = (timer / 90) * 100;
    const isMatchOver = timer >= 90;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0f172a] font-sans text-white overflow-hidden">
            <div className="relative z-10 w-full pt-10 pb-6 bg-[#1e293b] border-b border-slate-700 shadow-2xl">
                <div className="max-w-5xl mx-auto flex items-center justify-between px-6 md:px-12">
                    <div className="flex-1 text-right flex flex-col items-end">
                        <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center border-4 border-blue-500 mb-3 overflow-hidden">
                            <FlagIcon code={teamA.country} size="xl" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">{teamA.name}</h2>
                    </div>
                    <div className="mx-8 flex flex-col items-center">
                        <div className="flex items-center gap-6 bg-[#0f172a] px-10 py-3 rounded-3xl border border-slate-700 shadow-inner">
                            <span className="text-6xl md:text-7xl font-black text-white">{scoreA}</span>
                            <span className="text-3xl text-slate-500 font-light">:</span>
                            <span className="text-6xl md:text-7xl font-black text-white">{scoreB}</span>
                        </div>
                        <div className="mt-4 flex items-center gap-3 bg-[#1e293b] px-4 py-1.5 rounded-full border border-slate-700">
                            {!isMatchOver && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>}
                            <span className={`font-mono text-2xl font-black tracking-widest ${isMatchOver ? 'text-slate-400' : 'text-yellow-400'}`}>
                                {isMatchOver ? "KONIEC" : `${timer < 10 ? `0${timer}` : timer}'`}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 text-left flex flex-col items-start">
                        <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center border-4 border-red-500 mb-3 overflow-hidden">
                            <FlagIcon code={teamB.country} size="xl" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">{teamB.name}</h2>
                    </div>
                </div>
            </div>
            
            <div className="relative z-10 flex-1 overflow-hidden flex flex-col justify-end">
                <div ref={scrollRef} className="w-full max-w-4xl mx-auto px-4 space-y-4 overflow-y-auto custom-scrollbar scroll-smooth h-full pb-10 pt-10">
                    {evs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <div className="text-6xl mb-4 animate-spin-slow">⚽</div>
                            <div className="text-2xl font-light uppercase tracking-widest">Oczekiwanie na pierwszy gwizdek...</div>
                        </div>
                    ) : (
                        evs.map((ev, i) => (
                            <div key={i} className={`flex w-full animate-slide-up ${ev.team === 'home' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`relative max-w-[80%] md:max-w-[60%] p-5 rounded-2xl border shadow-lg flex items-center gap-5 ${ev.team === 'home' ? 'bg-[#1e293b] border-blue-500/50 text-left pr-10' : 'bg-[#1e293b] border-red-500/50 text-right flex-row-reverse pl-10'}`}>
                                    <div className="flex flex-col items-center justify-center min-w-[50px] bg-[#0f172a] p-2 rounded-xl border border-slate-700 shadow-inner">
                                        <div className="font-mono text-2xl font-black text-yellow-400 leading-none">{ev.minute}'</div>
                                    </div>
                                    <div className="flex-1">
                                        {ev.type === 'goal' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-yellow-400 font-black uppercase tracking-widest text-sm">
                                                    <span>⚽ GOL! {ev.isPenalty && <span className="text-[10px] text-yellow-200 bg-yellow-900/50 px-2 py-0.5 rounded border border-yellow-500/50 ml-2">KARNY</span>}</span>
                                                </div>
                                                <div className="text-2xl md:text-3xl font-black text-white leading-tight mt-1">{ev.scorer?.name}</div>
                                            </>
                                        ) : ev.type === 'missed_penalty' ? (
                                            <div className="text-red-500 font-black">❌ NIETRAFIONY KARNY: {ev.taker?.name}</div>
                                        ) : ev.type === 'injury' ? (
                                            <div className="text-red-400 font-bold">🚑 KONTUZJA: {ev.player?.name}</div>
                                        ) : ev.type === 'sub' ? (
                                            <div className="text-cyan-400 font-bold">🔄 ZMIANA: {ev.playerIn?.name}</div>
                                        ) : ev.type === 'yellow' ? (
                                            <div className="text-yellow-500 font-bold">🟨 ŻÓŁTA KARTKA: {ev.player?.name}</div>
                                        ) : ev.type === 'red' ? (
                                            <div className="text-red-500 font-bold">🟥 CZERWONA KARTKA: {ev.player?.name}</div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {isMatchOver ? (
                <div className="relative z-50 bg-[#1e293b] border-t border-slate-700 shadow-2xl p-6 md:p-10 flex flex-col items-center animate-slide-up">
                    <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-widest italic">Podsumowanie Spotkania</h3>
                    <div className="flex justify-center items-center gap-8 md:gap-16 mb-8 text-center text-sm font-bold text-slate-400 w-full max-w-2xl">
                        <div className="flex-1"><span className="block text-3xl font-black text-blue-400 mb-1">{matchData.chancesA}</span>Sytuacje</div>
                        <div className="flex-1"><span className="block text-3xl font-black text-emerald-400 mb-1">{matchData.savesA}</span>Obrony</div>
                        <div className="text-slate-700 text-5xl font-light opacity-50">|</div>
                        <div className="flex-1"><span className="block text-3xl font-black text-emerald-400 mb-1">{matchData.savesB}</span>Obrony</div>
                        <div className="flex-1"><span className="block text-3xl font-black text-red-400 mb-1">{matchData.chancesB}</span>Sytuacje</div>
                    </div>
                    <button onClick={onFinish} className="bg-cyan-600 hover:bg-cyan-500 text-white px-16 py-5 rounded-xl font-black text-xl tracking-widest uppercase transition-all shadow-md flex items-center gap-4 group">
                        <span>Przejdź Dalej</span><span className="group-hover:translate-x-2 transition-transform">➔</span>
                    </button>
                </div>
            ) : (
                <>
                    <div className="relative z-20 h-2.5 bg-slate-800 w-full shadow-inner">
                        <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-red-500 transition-all duration-[80ms] ease-linear" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="relative z-10 bg-[#0f172a] py-2.5 text-center text-xs text-slate-500 uppercase tracking-widest font-bold">
                        Symulacja na żywo • Polish Manager
                    </div>
                </>
            )}
        </div>
    );
};

const Dashboard = ({ myTeam, week, onPlayGame, lastResults, maxWeeks, onNewSeason, notifications, eventName, nextOpponent, isAway, activeSponsor }) => {
    const isOver = week > maxWeeks;
    const myLast = lastResults.find(r => r.host === myTeam?.name || r.guest === myTeam?.name);
    const leftTeam = isAway ? nextOpponent : myTeam;
    const rightTeam = isAway ? myTeam : nextOpponent;
    
    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in pb-12">

            {/* --- 1. GŁÓWNY BANER MECZOWY (LEWA STRONA, GÓRA) --- */}
            <div className="xl:col-span-2 relative rounded-3xl overflow-hidden shadow-xl border border-slate-700 bg-[#1e293b] flex flex-col justify-center min-h-[300px]">
                <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-8 h-full">
                    {/* LEWA DRUŻYNA */}
                    <div className="flex flex-col items-center justify-center w-full md:w-1/3">
                        {leftTeam ? (
                            <>
                                <div className={`w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center shadow-lg border-4 ${leftTeam.id === myTeam?.id ? 'border-cyan-500' : 'border-slate-700 bg-[#0f172a]'}`}>
                                    <FlagIcon code={leftTeam.country} size="xl" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-white mt-4 text-center tracking-tight">{leftTeam.name}</h2>
                                <div className="mt-2 text-[10px] text-slate-400 font-bold tracking-widest uppercase bg-[#0f172a] px-3 py-1 rounded-lg border border-slate-700">Gospodarz</div>
                            </>
                        ) : (
                            <div className="opacity-50 flex flex-col items-center">
                                <div className="w-28 h-28 md:w-36 md:h-36 bg-[#0f172a] rounded-full flex items-center justify-center border-4 border-slate-700 text-5xl">?</div>
                                <h2 className="text-lg font-bold text-slate-400 mt-4 text-center">TBA</h2>
                            </div>
                        )}
                    </div>

                    {/* ŚRODEK */}
                    <div className="flex flex-col items-center justify-center text-center w-full md:w-1/3 z-20 py-4 md:py-0 relative h-full">
                        <div className="text-xs font-black text-cyan-400 tracking-[0.2em] uppercase mb-4 bg-[#0f172a] px-5 py-2.5 rounded-full border border-slate-700 shadow-md z-20 whitespace-nowrap">
                            {isOver ? "KONIEC SEZONU" : eventName}
                        </div>
                        <div className="text-5xl md:text-7xl font-black text-slate-700/40 italic select-none z-10 drop-shadow-sm">
                            VS
                        </div>
                    </div>

                    {/* PRAWA DRUŻYNA */}
                    <div className="flex flex-col items-center justify-center w-full md:w-1/3">
                        {rightTeam ? (
                            <>
                                <div className={`w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center shadow-lg border-4 ${rightTeam.id === myTeam?.id ? 'border-cyan-500' : 'border-slate-700 bg-[#0f172a]'}`}>
                                    <FlagIcon code={rightTeam.country} size="xl" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-white mt-4 text-center tracking-tight">{rightTeam.name}</h2>
                                <div className="mt-2 text-[10px] text-slate-400 font-bold tracking-widest uppercase bg-[#0f172a] px-3 py-1 rounded-lg border border-slate-700">Gość</div>
                            </>
                        ) : (
                            <div className="opacity-50 flex flex-col items-center">
                                <div className="w-28 h-28 md:w-36 md:h-36 bg-[#0f172a] rounded-full flex items-center justify-center border-4 border-slate-700 text-5xl">?</div>
                                <h2 className="text-lg font-bold text-slate-400 mt-4 text-center">TBA</h2>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- 2. SEKCJA INFO (PRAWY GÓRNY RÓG) - POWIADOMIENIA I SPONSOR --- */}
            <div className="xl:col-span-1 flex flex-col gap-6">

                {/* POWIADOMIENIA */}
                <div className="bg-[#1e293b] rounded-3xl border border-slate-700 p-5 shadow-xl flex-1 flex flex-col min-h-[160px]">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-3 shrink-0">
                        <span className="text-xl">📢</span>
                        <h3 className="font-black text-white text-xs uppercase tracking-widest">Centrum Wiadomości</h3>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {notifications.length > 0 ? (
                            notifications.slice(0, 4).map((n, i) => (
                                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-700/50 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0">
                                    <span className="text-slate-300 pr-2 line-clamp-2">{n.text}</span>
                                    <span className={`font-mono font-bold whitespace-nowrap ${n.value > 0 ? 'text-emerald-400' : n.value < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                        {n.value !== 0 ? formatMoney(n.value) : ''}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-600 text-xs italic">Brak nowych wiadomości.</div>
                        )}
                    </div>
                </div>

                {/* SPONSOR */}
                <div className="bg-[#1e293b] border border-slate-700 p-5 rounded-3xl flex flex-col justify-center shadow-xl shrink-0">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="text-3xl">🤝</div>
                        <div>
                            <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-0.5">Sponsor Główny</h4>
                            <div className="text-sm font-bold text-white truncate" title={activeSponsor?.name || 'Brak sponsora'}>{activeSponsor ? activeSponsor.name : 'Brak'}</div>
                        </div>
                    </div>
                    <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Cel</span>
                            <span className="text-xs text-slate-300 font-medium">
                                {activeSponsor ? (activeSponsor.reqLeaguePos ? `Top ${activeSponsor.reqLeaguePos}` : 'Brak') : '-'}
                                {activeSponsor?.reqCup && ' + Puchar'}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Premia</span>
                            <span className="text-sm font-mono font-black text-emerald-400">{activeSponsor ? formatMoney(activeSponsor.bonusAmount) : '0 €'}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- 3. OSTATNI MECZ (LEWY DÓŁ) --- */}
            <div className="xl:col-span-2 bg-[#1e293b] rounded-3xl border border-slate-700 overflow-hidden shadow-xl flex flex-col h-[350px]">
                <div className="bg-[#0f172a] px-6 py-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <h3 className="font-black text-white uppercase text-xs tracking-widest flex items-center gap-2"><span>📊</span> Ostatni Występ</h3>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest bg-[#1e293b] px-2.5 py-1 rounded-md border border-slate-700">Raport</span>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-center relative overflow-y-auto custom-scrollbar">
                    {myLast ? (
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center bg-[#0f172a] p-4 md:p-5 rounded-2xl border border-slate-700 shadow-inner">
                                <div className="flex-1 text-right text-lg md:text-xl font-black text-white truncate">{myLast.host}</div>
                                <div className="px-5 py-2 mx-4 bg-[#1e293b] rounded-xl border border-slate-700 shadow-md flex items-center gap-3">
                                    <span className="text-3xl font-black text-cyan-400">{myLast.scoreA}</span>
                                    <span className="text-lg text-slate-600">:</span>
                                    <span className="text-3xl font-black text-cyan-400">{myLast.scoreB}</span>
                                </div>
                                <div className="flex-1 text-left text-lg md:text-xl font-black text-white truncate">{myLast.guest}</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 bg-[#0f172a] p-5 rounded-2xl border border-slate-700">
                                {(() => {
                                    const renderStat = (label, a, b) => (
                                        <div className="flex justify-between items-center text-xs font-bold border-b border-slate-700/50 pb-1.5 last:border-0 last:pb-0">
                                            <span className="text-cyan-400 w-8 text-right">{a}</span>
                                            <span className="text-slate-500 text-[9px] uppercase tracking-widest">{label}</span>
                                            <span className="text-cyan-400 w-8 text-left">{b}</span>
                                        </div>
                                    );
                                    return (
                                        <>
                                            <div className="space-y-2">
                                                {renderStat('Sytuacje', myLast.chancesA || 0, myLast.chancesB || 0)}
                                                {renderStat('Obrony', myLast.savesA || 0, myLast.savesB || 0)}
                                            </div>
                                            <div className="space-y-2">
                                                {renderStat('Faule', myLast.foulsA || 0, myLast.foulsB || 0)}
                                                {renderStat('Karne', myLast.penaltiesA || 0, myLast.penaltiesB || 0)}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-6">
                            <div className="text-4xl mb-3 opacity-50">⚽</div>
                            <p className="font-bold text-sm">Zagraj mecz, aby wygenerować raport.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 4. SZYBKIE WYNIKI (PRAWY DÓŁ) --- */}
            <div className="xl:col-span-1 bg-[#1e293b] rounded-3xl border border-slate-700 overflow-hidden shadow-xl flex flex-col h-[350px]">
                <div className="bg-[#0f172a] px-5 py-4 border-b border-slate-700 shrink-0">
                    <h3 className="font-black text-white uppercase text-xs tracking-widest flex items-center gap-2"><span>📰</span> Ost. Wyniki</h3>
                </div>
                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-1.5">
                    {lastResults.length > 0 ? (
                        lastResults.map((r, i) => (
                            <div key={i} className="bg-[#0f172a] p-2.5 rounded-xl border border-slate-700 flex justify-between items-center text-[10px] shadow-sm hover:border-slate-500 transition-colors">
                                <span className="w-2/5 text-right font-bold text-slate-300 truncate pr-2">{r.host}</span>
                                <span className="w-1/5 text-center bg-[#1e293b] text-cyan-400 px-1.5 py-1 rounded font-mono font-black border border-slate-700">{r.scoreA}:{r.scoreB}</span>
                                <span className="w-2/5 text-left font-bold text-slate-300 truncate pl-2">{r.guest}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-slate-600 font-medium py-10 text-xs flex items-center justify-center h-full">Sezon jeszcze się nie zaczął.</div>
                    )}
                </div>
            </div>
            
        </div>
    );
};

const TransferMarketView = ({ transferList, budget, onTransfer, managerData }) => {
    const discount = (managerData?.skills?.negotiator || 0) * 0.05;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">RYNEK TRANSFEROWY</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {transferList.map(p => (
                    <div key={p.id} className="group relative bg-[#1e293b] border border-slate-700 hover:border-cyan-500 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
                        
                        <div className="p-6 border-b border-slate-700 bg-[#0f172a] flex gap-4 items-center">
                            <div className="relative">
                                <div className="w-16 h-16 bg-[#1e293b] rounded-xl border border-slate-700 flex items-center justify-center font-black text-white text-2xl shadow-inner group-hover:scale-105 transition-transform">
                                    {p.skill}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-[#0f172a] rounded-full p-1 border border-slate-700 shadow-md">
                                    <FlagIcon code={p.nation.code} size="md" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-lg text-white truncate leading-tight group-hover:text-cyan-400 transition-colors" title={p.fullName || p.name}>
                                    {p.fullName || p.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    {p.position} • {p.age} LAT
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-5 flex-1 flex flex-col justify-center gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Potencjał</span>
                                <span className="text-sm font-black text-emerald-400 bg-[#0f172a] px-3 py-1 rounded-lg border border-slate-700">
                                    {p.potential}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Wartość</span>
                                <div className="flex flex-col items-end">
                                    {discount > 0 && <span className="text-[9px] text-red-400 line-through">{formatMoney(p.value)}</span>}
                                    <span className={`text-sm font-mono font-bold ${discount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                                        {formatMoney(Math.floor(p.value * (1 - discount)))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-[#0f172a] flex gap-2 border-t border-slate-700">
                            <button onClick={() => onTransfer(p, 'buy')} className="flex-1 bg-[#1e293b] hover:bg-emerald-600 text-emerald-400 hover:text-white border border-slate-700 hover:border-emerald-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                KUP
                            </button>
                            <button onClick={() => onTransfer(p, 'loan_opt')} className="flex-1 bg-[#1e293b] hover:bg-cyan-600 text-cyan-400 hover:text-white border border-slate-700 hover:border-cyan-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
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
    <div className="space-y-6 animate-fade-in">
        <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700 shadow-xl flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center text-3xl z-10 border border-slate-700">📜</div>
            <div className="z-10 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">HISTORIA KARIERY</h2>
            </div>
        </div>

        {history.length === 0 ? (
            <div className="text-center py-20 bg-[#1e293b] rounded-3xl border border-slate-700 text-slate-500 text-lg">
                Zakończ swój pierwszy sezon, aby zobaczyć tutaj wpis.
            </div>
        ) : (
            <div className="grid gap-6">
                {history.map((h, i) => (
                    <div key={i} className="bg-[#1e293b] rounded-3xl border border-slate-700 p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl hover:border-amber-500 transition-all hover:-translate-y-1">
                        
                        <div className="flex items-center gap-6 md:w-1/3">
                            <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-700 text-center min-w-[90px] shadow-inner">
                                <div className="text-[10px] text-amber-500 uppercase font-black tracking-widest">Sezon</div>
                                <div className="text-4xl font-black text-white">{h.season}</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white italic tracking-tight">{h.teamName}</h3>
                                <div className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1 bg-[#0f172a] inline-block px-2 py-1 rounded border border-slate-700">
                                    {h.leagueName}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-8 text-center border-y md:border-y-0 md:border-x border-slate-700 py-4 md:py-0 px-8 w-full md:w-auto justify-center">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Miejsce</div>
                                <div className={`text-4xl font-black ${h.position === 1 ? 'text-yellow-400' : h.position <= 3 ? 'text-emerald-400' : 'text-white'}`}>
                                    {h.position}
                                    {h.position === 1 && <span className="text-lg ml-1">🏆</span>}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Punkty</div>
                                <div className="text-4xl font-black text-white">{h.points}</div>
                            </div>
                        </div>

                        <div className="md:w-1/3 flex flex-col gap-3 w-full">
                            <div className="flex justify-between items-center bg-[#0f172a] px-4 py-2.5 rounded-xl border border-slate-700">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Puchar Polski</span>
                                <span className={`text-xs font-bold ${h.cupResult.includes('ZWYCIĘZCA') ? 'text-yellow-400' : 'text-white'}`}>{h.cupResult || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-[#0f172a] px-4 py-2.5 rounded-xl border border-slate-700">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Liga Mistrzów</span>
                                <span className={`text-xs font-bold ${h.clResult.includes('ZWYCIĘZCA') ? 'text-yellow-400' : 'text-white'}`}>{h.clResult || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-[#0f172a] px-4 py-2.5 rounded-xl border border-slate-700">
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
    <div className="space-y-6 animate-fade-in">
        <div className="bg-[#1e293b] rounded-3xl border border-slate-700 p-8 shadow-xl">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tight flex items-center gap-3">
                        <span>🌍</span> CENTRUM SKAUTINGU
                    </h2>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {SCOUTING_REGIONS.map(r => (
                    <div key={r.id} className="bg-[#0f172a] border border-slate-700 hover:border-cyan-500 rounded-2xl p-5 transition-all hover:-translate-y-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-black text-white text-lg leading-tight transition-colors">{r.name}</h3>
                            <div className="text-xs text-slate-400 mt-2 font-mono font-bold bg-[#1e293b] inline-block px-2 py-1 rounded border border-slate-700">
                                Koszt: {formatMoney(r.cost)}
                            </div>
                        </div>
                        <button onClick={()=>onScout(r)} className="mt-5 w-full py-3 bg-[#1e293b] hover:bg-cyan-600 text-cyan-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-700 hover:border-cyan-500 transition-all">
                            Wyślij Skauta
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-[#1e293b] rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-[#0f172a] flex items-center justify-between">
                <h3 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2">
                    <span>🎓</span> Raporty z Akademii
                </h3>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-300 min-w-[700px]">
                    <thead className="bg-[#0f172a] text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-700">
                        <tr>
                            <th className="p-5 font-bold">Imię i Nazwisko</th>
                            <th className="p-5 text-center font-bold">Wiek</th>
                            <th className="p-5 text-center font-bold">Obecny OVR</th>
                            <th className="p-5 text-center font-bold">Potencjał</th>
                            <th className="p-5 text-right font-bold">Decyzja</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {academy.length === 0 ? (
                            <tr><td colSpan="5" className="p-10 text-center text-slate-500 italic">Brak juniorów w akademii. Wyślij skautów w świat!</td></tr>
                        ) : academy.map(j => (
                            <tr key={j.id} className="hover:bg-[#0f172a] transition-colors group">
                                <td className="p-5 flex gap-4 items-center">
                                    <div className="w-8 h-8 rounded-full overflow-hidden shadow border border-slate-700 flex items-center justify-center bg-slate-800">
                                        <FlagIcon code={j.nation.code} size="xl" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">{j.name}</div>
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{j.position}</div>
                                    </div>
                                </td>
                                <td className="p-5 text-center font-mono font-medium">{j.age}</td>
                                <td className="p-5 text-center font-black text-white text-xl">{j.skill}</td>
                                <td className="p-5 text-center">
                                    <span className="font-black text-emerald-400 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-slate-700 inline-block min-w-[40px]">
                                        {j.potential}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        {j.age >= 16 ? (
                                            <button onClick={()=>onPromote(j.id)} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-transform shadow-md">
                                                Kontrakt
                                            </button>
                                        ) : (
                                            <div className="bg-[#0f172a] text-slate-500 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-not-allowed border border-slate-700">
                                                Za młody
                                            </div>
                                        )}
                                        <button onClick={()=>onFire(j.id)} className="bg-[#0f172a] hover:bg-red-600 border border-slate-700 hover:border-red-500 px-3 py-2 rounded-xl text-red-400 hover:text-white text-xs font-black transition-all shadow-md" title="Zwolnij z akademii">
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
            {(() => {
                const req = FORMATIONS[myFormation];
                const counts = { BR: 0, OBR: 0, POM: 0, NAP: 0 };
                starters.forEach(p => { if (counts[p.position] !== undefined) counts[p.position]++; });
                
                let mismatches = Math.abs(req.BR - counts.BR) + Math.abs(req.OBR - counts.OBR) + 
                                 Math.abs(req.POM - counts.POM) + Math.abs(req.NAP - counts.NAP);
                const penalty = (mismatches / 2) * 5;

                return (
                    <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 shadow-xl flex flex-col xl:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-xl font-black italic text-white mb-3 uppercase tracking-widest">Taktyka i Zgranie</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(FORMATIONS).map(form => (
                                    <button key={form} onClick={() => setMyFormation(form)} className={`px-4 py-2.5 rounded-xl font-black text-xs md:text-sm tracking-widest transition-all border ${myFormation === form ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                        {form}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 w-full max-w-lg bg-[#0f172a] p-4 rounded-2xl border border-slate-700 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-3 relative z-10">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wymagania formacji:</span>
                                <span className={`text-sm md:text-base font-black px-3 py-1 rounded-lg border shadow-inner ${penalty === 0 ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400' : 'bg-red-900/40 border-red-500/50 text-red-400'}`}>
                                    {penalty === 0 ? '✅ 100% ZGRANIA' : `⚠️ KARA DO OVR: -${penalty}`}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 text-center text-[10px] md:text-xs font-black relative z-10">
                                <div className={`p-2.5 rounded-xl border transition-colors ${counts.BR === req.BR ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}>BR: {counts.BR}/{req.BR}</div>
                                <div className={`p-2.5 rounded-xl border transition-colors ${counts.OBR === req.OBR ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}>OBR: {counts.OBR}/{req.OBR}</div>
                                <div className={`p-2.5 rounded-xl border transition-colors ${counts.POM === req.POM ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}>POM: {counts.POM}/{req.POM}</div>
                                <div className={`p-2.5 rounded-xl border transition-colors ${counts.NAP === req.NAP ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}>NAP: {counts.NAP}/{req.NAP}</div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div className="flex bg-[#1e293b] p-1.5 rounded-2xl w-fit border border-slate-700 shadow-xl">
                <button onClick={() => setViewMode('pitch')} className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${viewMode === 'pitch' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                    🏟️ Ustawienie
                </button>
                <button onClick={() => setViewMode('stats')} className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${viewMode === 'stats' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                    📊 Statystyki
                </button>
            </div>

            {viewMode === 'pitch' ? (
                <div className="flex flex-col xl:flex-row gap-8">
                    <div className="flex-1 relative bg-[#0f172a] rounded-3xl border border-slate-700 shadow-2xl min-h-[750px] flex flex-col overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-10"></div>
                        <div className="relative z-10 flex-1 grid grid-rows-4 py-8 px-4">
                            <div className="flex justify-center gap-16 items-end pb-4">{starters.filter(p => p.position === 'NAP').map(p => <FUTCard key={p.id} player={p} isSelected={swapSourceId === p.id} onClick={(e) => handlePitchCardClick(e, p)} />)}</div>
                            <div className="flex justify-center gap-6 items-center">{starters.filter(p => p.position === 'POM').map(p => <FUTCard key={p.id} player={p} isSelected={swapSourceId === p.id} onClick={(e) => handlePitchCardClick(e, p)} />)}</div>
                            <div className="flex justify-center gap-6 items-start pt-4">{starters.filter(p => p.position === 'OBR').map(p => <FUTCard key={p.id} player={p} isSelected={swapSourceId === p.id} onClick={(e) => handlePitchCardClick(e, p)} />)}</div>
                            <div className="flex justify-center items-end pb-2">{starters.filter(p => p.position === 'BR').map(p => <FUTCard key={p.id} player={p} isSelected={swapSourceId === p.id} onClick={(e) => handlePitchCardClick(e, p)} />)}</div>
                        </div>
                    </div>
                
                    <div className="w-full xl:w-96 flex flex-col gap-4">
                        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 h-full shadow-2xl flex flex-col">
                            <h3 className="text-white font-black mb-4 text-xs uppercase tracking-widest border-b border-slate-700 pb-4 flex items-center gap-3">
                                <span>🪑</span> Ławka Rezerwowych
                            </h3>
                            <div className="grid grid-cols-1 gap-3 overflow-y-auto custom-scrollbar pr-2 h-[660px]">
                                {bench.map(p => (
                                    <div key={p.id} onClick={(e) => handlePitchCardClick(e, p)} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${swapSourceId === p.id ? 'bg-cyan-900/50 border-cyan-500' : 'bg-[#0f172a] border-slate-700 hover:border-slate-500'}`}>
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
                <div className="bg-[#1e293b] rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm text-slate-300 min-w-[900px]">
                            <thead className="bg-[#0f172a] uppercase text-[10px] font-black tracking-widest text-slate-500 border-b border-slate-700">
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
                            <tbody className="divide-y divide-slate-700">
                                {statsPlayers.map(p => (
                                    <tr key={p.id} className="hover:bg-[#0f172a] transition-colors cursor-pointer group" onClick={() => openPlayerModal(p)}>
                                        <td className="px-6 py-4">
                                            <span className={`text-[9px] font-black tracking-widest px-3 py-1.5 rounded-lg border shadow-sm ${p.isStarter ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' : 'bg-[#1e293b] text-slate-500 border-slate-700'}`}>
                                                {p.isStarter ? '1. SKŁAD' : 'ŁAWKA'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full overflow-hidden shadow border border-slate-700 flex items-center justify-center bg-slate-800">
                                                <FlagIcon code={p.nation?.code} size="xl" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-base flex items-center gap-2 group-hover:text-cyan-300 transition-colors">
                                                    {p.name} 
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
                                                <span className={`text-base ${p.form >= 8 ? 'text-orange-500' : p.form <= 3 ? 'text-blue-400' : 'text-slate-300'}`}>
                                                    {Math.floor(p.form)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-xl font-black text-cyan-400">{p.skill}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-bold text-emerald-400 bg-[#0f172a] px-3 py-1.5 rounded-xl border border-slate-700">
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
  
  let bgClass = "bg-gradient-to-br from-amber-900 via-amber-700 to-amber-950 border-amber-500/50"; 
  let textClass = "text-amber-100";
  let glowClass = "shadow-[0_10px_20px_rgba(217,119,6,0.4)]";
  let rarityGlow = "";

  if (player.skill >= 85) { 
      bgClass = "bg-gradient-to-br from-purple-900 via-fuchsia-700 to-purple-950 border-fuchsia-400/80"; 
      textClass = "text-fuchsia-50"; 
      glowClass = "shadow-[0_10px_30px_rgba(192,38,211,0.6)]";
      rarityGlow = "ring-2 ring-fuchsia-500/50 animate-pulse";
  } else if (player.skill >= 75) { 
      bgClass = "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 border-yellow-300/80"; 
      textClass = "text-yellow-950"; 
      glowClass = "shadow-[0_10px_25px_rgba(234,179,8,0.5)]";
  } else if (player.skill >= 65) { 
      bgClass = "bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 border-white/60"; 
      textClass = "text-slate-900"; 
      glowClass = "shadow-[0_10px_15px_rgba(255,255,255,0.3)]";
  }
  
  return (
      <div onClick={onClick} className={`relative w-32 h-48 cursor-pointer transition-all duration-300 group z-50 pointer-events-auto rounded-t-lg rounded-b-2xl overflow-hidden card-holo-effect ${rarityGlow} ${isSelected ? 'scale-110 ring-4 ring-cyan-500 shadow-cyan-500/80 z-[60]' : `hover:scale-110 hover:-translate-y-4 hover:z-[60] ${glowClass}`}`}>
        {player.injury > 0 && <div className="absolute top-1 right-1 z-[60] bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md border border-red-900 shadow-lg animate-pulse">🚑 {player.injury}</div>}
        {player.suspension > 0 && <div className="absolute top-1 left-1 z-[60] bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-md border border-yellow-900 shadow-lg">🚫 {player.suspension}</div>}
        
        <div className={`absolute inset-0 ${bgClass} opacity-95`}>
            <div className="absolute top-0 left-0 w-full h-[55%] bg-gradient-to-b from-white/40 to-transparent transform -skew-y-12 origin-top-left mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-multiply"></div>
        </div>

        <div className={`relative z-10 h-full flex flex-col pt-3 pb-2 px-2 ${textClass}`}>
            <div className="flex flex-col items-start z-20 w-10">
                <span className="text-3xl font-display font-black tracking-tighter drop-shadow-md leading-none">{player.skill}</span>
                <span className="text-[10px] font-bold uppercase mt-1 mb-1 opacity-90 leading-none tracking-widest">{player.position}</span>
                <div className="shadow-md rounded-sm border border-current/20 overflow-hidden mt-1">
                    <FlagIcon code={player.nation?.code || player.country} size="md" />
                </div>
            </div>
            
            <div className="absolute top-2 right-0 w-28 h-28 flex items-end justify-center z-10 pointer-events-none drop-shadow-2xl overflow-hidden">
                <img src={getPlayerFace(player)} alt={player.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 24 24' fill='none' stroke='%231e293b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E"; }} />
            </div>
            
            <div className="mt-auto z-20 flex flex-col bg-gradient-to-t from-black/60 to-transparent pt-4 pb-1 -mx-2 px-2">
                <div className="text-center mb-1">
                    <p className="text-[11px] font-display font-black uppercase truncate tracking-wide drop-shadow-md border-b border-current/30 pb-1">{player.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] font-bold text-center leading-tight opacity-95">
                    <span className="flex justify-between"><span>PAC</span> <span>{player.stats?.pace || 50}</span></span>
                    <span className="flex justify-between"><span>DRI</span> <span>{player.stats?.dribbling || 50}</span></span>
                    <span className="flex justify-between"><span>SHO</span> <span>{player.stats?.shooting || 50}</span></span>
                    <span className="flex justify-between"><span>DEF</span> <span>{player.stats?.defense || 50}</span></span>
                </div>
            </div>
        </div>
      </div>
  );
};

const getPlayerFace = (player) => {
    const countryCode = player.nation?.code || player.country || 'PL';
    const faceCounts = { FR: 14, PL: 1, EN: 1, 'GB-ENG': 1, ES: 1, DE: 1, IT: 1 };
    const maxFaces = faceCounts[countryCode] || 1; 
    const idHash = String(player.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const faceIndex = (idHash % maxFaces) + 1;
    let fileCode = countryCode.toLowerCase();
    if (fileCode === 'gb-eng') fileCode = 'en'; 
    return `/faces/${fileCode}_${faceIndex}.png`;
};

const makeimage = (borderCoords, backgroundCard, countryCard, playerImage, playerName, playerPosition, playerStats, canvasId) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 454;
    canvas.height = 708;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const backgroundCardImage = new Image();
    backgroundCardImage.src = backgroundCard;
    backgroundCardImage.onload = () => {
        ctx.drawImage(backgroundCardImage, 0, 0);

        const countryCardImage = new Image();
        countryCardImage.src = countryCard;
        countryCardImage.onload = () => {
            ctx.drawImage(countryCardImage, (canvas.width - countryCardImage.width) / 2, (canvas.height - countryCardImage.height) / 2);

            if (playerImage) {
                const playerWidth = 350;
                const playerHeight = 350;
                const playerX = (canvas.width - playerWidth) / 2;
                const playerY = 160;

                ctx.save(); 
                ctx.beginPath();
                if (borderCoords && borderCoords.length > 0) {
                    ctx.moveTo(borderCoords[0][0], borderCoords[0][1]);
                    for (let i = 1; i < borderCoords.length; i++) {
                        ctx.lineTo(borderCoords[i][0], borderCoords[i][1]);
                    }
                }
                ctx.closePath(); 
                ctx.clip(); 
                ctx.drawImage(playerImage, playerX, playerY, playerWidth, playerHeight);
                ctx.restore(); 
            }

            ctx.fillStyle = 'black';
            ctx.font = '30px Arial';
            ctx.fillText(playerName, (canvas.width - ctx.measureText(playerName).width) / 2, 500);
            ctx.font = 'bold 30px Arial';
            ctx.fillText(playerPosition, (canvas.width - ctx.measureText(playerPosition).width) / 2, 130);

            const stats = Object.entries(playerStats);
            stats.forEach((stat, index) => {
                ctx.fillStyle = 'black';
                ctx.font = '20px Arial';
                ctx.fillText(stat[0] + ': ' + stat[1], 100, 550 + (index * 20));
            });
        };
    };
};

const PlayerDetailModal = ({ player, onClose, onSwap, swapSourceId, onSell, onBuyOption, managerData }) => {
    const sellPercent = 75 + ((managerData?.skills?.negotiator || 0) * 5);
    if (!player) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-[#1e293b] border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="w-full md:w-1/3 bg-[#0f172a] p-8 flex items-center justify-center relative"><div className="scale-150 transform"><FUTCard player={player} onClick={() => {}} /></div></div>
                <div className="flex-1 p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl">✕</button>
                    <div className="flex justify-between items-end mb-6 border-b border-slate-700 pb-4">
                        <div>
                           <h2 className="text-3xl font-black italic uppercase tracking-tighter">{player.fullName || player.name}</h2>
<div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
    <span className="flex items-center gap-1"><FlagIcon code={player.nation?.code} /> {player.nation?.name}</span>
    <span>•</span><span>Lat: {player.age}</span>
    <span>•</span>
    <span className={`font-bold flex items-center gap-1 ${player.form >= 8 ? 'text-orange-500' : player.form <= 3 ? 'text-blue-400' : 'text-slate-300'}`}>
        Forma: {Math.floor(player.form)}/10 {player.form >= 8 ? '🔥' : player.form <= 3 ? '❄️' : ''}
    </span>
    {player.wage && <span className="text-yellow-500">• Pensja: {formatMoney(player.wage)}</span>}
    {player.injury > 0 && (
        <span className="text-red-400 font-bold bg-red-900/30 px-2 py-1 rounded border border-red-500/50 animate-pulse">
            🚑 KONTUZJA: {player.injury} tyg.
        </span>
    )}
</div>
                        </div>
                        <div className="text-right">
                            <div className="flex justify-end items-end gap-2 mb-3 pb-3 border-b border-slate-700">
                                <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-widest">OVR</div>
                                <div className="text-5xl font-black text-white leading-none">{player.skill}</div>
                            </div>
                            <div className="text-sm uppercase text-slate-500 font-bold mb-1">Wartość</div>
                            <div className="text-2xl font-black text-emerald-400">{formatMoney(player.value)}</div>
                            <div className="text-xs text-slate-500 mt-1">Potencjał: {player.potential}</div>
                        </div>
                    </div>
                    {player.perk && PERKS[player.perk] && (
                        <div className="mb-6 bg-[#0f172a] border border-yellow-500/30 p-4 rounded-xl flex items-center gap-4 shadow-inner">
                            <div className="text-4xl drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">{PERKS[player.perk].icon}</div>
                            <div>
                                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                    {PERKS[player.perk].desc}
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8"><StatBar label="Tempo (PAC)" value={player.stats.pace} /><StatBar label="Strzały (SHO)" value={player.stats.shooting} /><StatBar label="Podania (PAS)" value={player.stats.passing} /><StatBar label="Drybling (DRI)" value={player.stats.dribbling} /><StatBar label="Obrona (DEF)" value={player.stats.defense} /><StatBar label="Fizyczność (PHY)" value={player.stats.physical} /></div>
                    
                    <div className="flex gap-4">
                        <button onClick={() => onSwap(player.id)} className={`flex-1 py-4 rounded-xl font-bold text-lg transition shadow-lg ${swapSourceId === player.id ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}>{swapSourceId === null ? "ZMIANY W SKŁADZIE" : swapSourceId === player.id ? "ANULUJ" : "ZAMIEŃ"}</button>
                        
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
        <div className="space-y-6 animate-fade-in">
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700 shadow-xl flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center text-3xl z-10 border border-slate-700">⚽</div>
                <div className="z-10 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">TOP STRZELCY</h2>
                </div>
            </div>

            <div className="bg-[#1e293b] rounded-3xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-300 min-w-[700px]">
                        <thead className="bg-[#0f172a] uppercase text-[10px] font-black tracking-widest text-slate-500 border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-5 w-16 text-center">Msc</th>
                                <th className="px-6 py-5">Zawodnik</th>
                                <th className="px-4 py-5">Klub</th>
                                <th className="px-6 py-5 text-center">Gole</th>
                                <th className="px-6 py-5 text-center">Asysty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {sorted.map((p, i) => { 
                                const club = teams.find(t => t.id === p.teamId); 
                                let rankBadge = <span className="text-slate-500 font-mono text-lg">{i+1}</span>;
                                let rowClass = "hover:bg-[#0f172a]";
                                
                                if (i === 0) {
                                    rankBadge = <span className="text-2xl">🥇</span>;
                                    rowClass = "bg-yellow-900/10 border-l-4 border-yellow-500";
                                } else if (i === 1) {
                                    rankBadge = <span className="text-2xl">🥈</span>;
                                    rowClass = "bg-[#0f172a] border-l-4 border-slate-400";
                                } else if (i === 2) {
                                    rankBadge = <span className="text-2xl">🥉</span>;
                                    rowClass = "bg-[#0f172a] border-l-4 border-amber-600";
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
                                            <span className={`text-2xl font-black ${i === 0 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'text-cyan-400'}`}>
                                                {p.goals}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-slate-500 font-mono text-lg bg-[#0f172a] px-3 py-1 rounded-lg border border-slate-700">
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

const MultiLeagueTable = ({ teams, activeTab, setTab, myTeam }) => { 
    const leagueTeams = teams
        .filter(t => t.league === activeTab && t.country === myTeam.country)
        .sort((a,b) => b.points - a.points || (b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst));
        
    const getRowStyle = (idx, total, teamId) => { 
        const isMyTeam = String(teamId) === String(myTeam.id);
        let base = `border-l-4 transition-all duration-300 ${isMyTeam ? 'bg-cyan-900/30 hover:bg-cyan-900/50 ' : 'hover:bg-[#0f172a] '}`;

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
        <div className="space-y-6 animate-fade-in"> 
            <div className="bg-[#1e293b] p-6 md:p-8 rounded-3xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl">
                <div className="relative z-10 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic flex items-center justify-center md:justify-start gap-3">
                        <span>🏆</span> TABELA LIGOWA
                    </h2>
                </div>
                
                <div className="relative z-10 flex bg-[#0f172a] p-1.5 rounded-2xl border border-slate-700 shadow-inner">
                    {[1, 2, 3].map(id => (
                        <button key={id} onClick={()=>setTab(id)} className={`px-8 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 ${activeTab===id ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                            Liga {id}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-[#1e293b] rounded-3xl overflow-hidden shadow-xl border border-slate-700">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-300 min-w-[750px]">
                        <thead className="bg-[#0f172a] uppercase text-[10px] font-black tracking-widest text-slate-500 border-b border-slate-700">
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
                        <tbody className="divide-y divide-slate-700">
                            {leagueTeams.map((t, i) => {
                                const isMyTeam = String(t.id) === String(myTeam.id);
                                return (
                                    <tr key={t.id} className={`group ${getRowStyle(i, leagueTeams.length, t.id)}`}>
                                        <td className="px-6 py-4 font-mono font-bold opacity-50 group-hover:opacity-100 transition-opacity text-lg">{i+1}</td>
                                        <td className="px-6 py-4 font-bold flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border shadow-sm ${isMyTeam ? 'border-cyan-400' : 'border-slate-700 bg-[#0f172a]'}`}>
                                                <FlagIcon code={t.country} size="md" />
                                            </div>
                                            <span className={`text-base transition-colors ${isMyTeam ? 'text-cyan-300' : 'text-white group-hover:text-cyan-300'}`}>
                                                {t.name}
                                            </span>
                                            {activeTab > 1 && i <= 1 && <span className="text-[9px] font-black tracking-wider bg-[#0f172a] text-emerald-400 px-2 py-0.5 rounded border border-slate-700">AWANS</span>}
                                            {activeTab > 1 && i >= 2 && i <= 5 && <span className="text-[9px] font-black tracking-wider bg-[#0f172a] text-yellow-400 px-2 py-0.5 rounded border border-slate-700">BARAŻ</span>}
                                            {activeTab < 3 && i >= leagueTeams.length-3 && <span className="text-[9px] font-black tracking-wider bg-[#0f172a] text-red-400 px-2 py-0.5 rounded border border-slate-700">SPADEK</span>}
                                            {isMyTeam && <span className="text-[9px] font-black tracking-wider bg-cyan-600 text-white px-2 py-0.5 rounded ml-2 animate-pulse">TY</span>}
                                        </td>
                                        <td className="px-3 py-4 text-center font-mono text-white">{t.played}</td>
                                        <td className="px-3 py-4 text-center text-slate-500 font-mono">{t.won}</td>
                                        <td className="px-3 py-4 text-center text-slate-500 font-mono">{t.drawn}</td>
                                        <td className="px-3 py-4 text-center text-slate-500 font-mono">{t.lost}</td>
                                        <td className="px-3 py-4 text-center text-slate-400 font-mono">{t.goalsFor}:{t.goalsAgainst}</td>
                                        <td className={`px-6 py-4 text-center font-black text-2xl ${isMyTeam ? 'text-cyan-400' : 'text-white'}`}>{t.points}</td>
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
const StatBar = ({ label, value }) => ( <div> <div className="flex justify-between text-xs mb-1 text-slate-400"> <span>{label}</span> <span>{value}</span> </div> <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden"> <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, value)}%` }}></div> </div> </div> );
const CupView = ({ history, myTeamId }) => ( 
    <div className="space-y-6 animate-fade-in"> 
        <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700 shadow-xl flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-[#0f172a] rounded-2xl flex items-center justify-center text-4xl z-10 border border-slate-700">🇵🇱</div>
            <div className="z-10 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">PUCHAR KRAJOWY</h2> 
            </div>
        </div>
        
        {history.length === 0 ? <div className="text-center py-20 bg-[#1e293b] rounded-3xl border border-slate-700 text-slate-500 text-lg">Puchar jeszcze nie wystartował.</div> : ( 
            <div className="space-y-8"> 
                {history.map((round, idx) => ( 
                    <div key={idx} className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-xl"> 
                        <div className="bg-[#0f172a] p-4 font-black text-white text-center border-b border-slate-700 tracking-widest text-sm uppercase">
                            {round.round}
                        </div> 
                        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4"> 
                            {round.matches.map((m, mIdx) => { 
                                const isHostWinner = String(m.winnerId) === String(m.hostId); 
                                const isGuestWinner = String(m.winnerId) === String(m.guestId);
                                const isHostMyTeam = String(m.hostId) === String(myTeamId);
                                const isGuestMyTeam = String(m.guestId) === String(myTeamId);

                                return ( 
                                    <div key={mIdx} className="flex justify-between items-center bg-[#0f172a] p-4 rounded-xl border border-slate-700"> 
                                        <div className={`flex-1 text-right flex items-center justify-end gap-2 truncate ${isHostWinner ? "font-black text-white" : "text-slate-500 font-medium"}`}>
                                            <span className={`truncate ${isHostMyTeam ? 'text-cyan-400' : ''}`}>{m.host}</span>
                                            {isHostMyTeam && <span className="text-xs">⭐</span>}
                                            {isHostWinner && <span className="text-emerald-500 text-xs">🏆</span>}
                                        </div> 

                                        <div className="mx-4 flex flex-col items-center min-w-[70px]">
                                            <div className="bg-[#1e293b] px-3 py-1.5 rounded-lg text-white font-mono font-bold border border-slate-700 flex items-center gap-1">
                                                <span>{m.scoreA}</span><span className="text-slate-500">:</span><span>{m.scoreB}</span>
                                            </div>
                                        </div> 

                                        <div className={`flex-1 text-left flex items-center justify-start gap-2 truncate ${isGuestWinner ? "font-black text-white" : "text-slate-500 font-medium"}`}>
                                            {isGuestWinner && <span className="text-emerald-500 text-xs">🏆</span>}
                                            {isGuestMyTeam && <span className="text-xs">⭐</span>}
                                            <span className={`truncate ${isGuestMyTeam ? 'text-cyan-400' : ''}`}>{m.guest}</span>
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
        <div className="space-y-6 animate-fade-in">
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700 flex flex-col md:flex-row items-center gap-6 shadow-xl">
                <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center text-3xl z-10 border border-slate-700">⭐</div>
                <div className="z-10 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">UEFA CHAMPIONS LEAGUE</h2>
                </div>
            </div>

            {!clState.active ? (
                <div className="text-center py-20 bg-[#1e293b] rounded-3xl border border-slate-700 text-slate-500">
                    <p className="text-2xl font-bold mb-2">Rozgrywki nieaktywne.</p>
                    <p className="text-sm">Zdobądź czołowe miejsce w lidze i sprawdź się w 2. sezonie!</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {(clState.history || []).length === 0 && clState.phase === 'ro32' && (
                        <div className="bg-[#0f172a] border border-blue-500/30 p-6 rounded-2xl text-center text-blue-300 font-bold animate-pulse shadow-lg">
                            Losowanie zakończone! Mecze 1/16 Finału rozpoczną się w 5. kolejce.
                        </div>
                    )}
                    
                    {(clState.history || []).map((round, idx) => (
                        <div key={idx} className="bg-[#1e293b] rounded-3xl border border-slate-700 overflow-hidden shadow-xl">
                            <div className="bg-[#0f172a] p-5 font-black text-white text-center border-b border-slate-700 tracking-widest flex justify-center items-center gap-3">
                                <span className="text-blue-400 text-lg">⚽</span> {round.round} <span className="text-blue-400 text-lg">⚽</span>
                            </div>
                            
                            <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {(round.matches || []).map((m, mIdx) => {
                                    const isHostWinner = String(m.winnerId) === String(m.hostId);
                                    const isGuestWinner = String(m.winnerId) === String(m.guestId);
                                    const isHostMyTeam = String(m.hostId) === String(myTeamId);
                                    const isGuestMyTeam = String(m.guestId) === String(myTeamId);

                                    return (
                                        <div key={mIdx} className={`flex justify-between items-center bg-[#0f172a] p-4 md:p-5 rounded-2xl border transition-all ${isHostMyTeam || isGuestMyTeam ? 'border-cyan-500/50' : 'border-slate-700 hover:border-slate-500'}`}>
                                            <div className={`flex-1 text-right flex items-center justify-end gap-2 truncate ${isHostWinner ? "font-black text-white" : "text-slate-500 font-medium"}`}>
                                                <span className={`truncate ${isHostMyTeam ? 'text-cyan-400' : ''}`}>{m.host}</span>
                                            </div>
                                            
                                            <div className="mx-4 flex flex-col items-center min-w-[70px]">
                                                <div className="bg-[#1e293b] px-4 py-2 rounded-xl text-white font-mono font-black border border-slate-700 flex items-center gap-1.5 text-lg">
                                                    <span>{m.scoreA}</span><span className="text-slate-600">:</span><span>{m.scoreB}</span>
                                                </div>
                                            </div>
                                            
                                            <div className={`flex-1 text-left flex items-center justify-start gap-2 truncate ${isGuestWinner ? "font-black text-white" : "text-slate-500 font-medium"}`}>
                                                <span className={`truncate ${isGuestMyTeam ? 'text-cyan-400' : ''}`}>{m.guest}</span>
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
        let base = 'border-l-4 transition-all duration-300 hover:bg-[#0f172a] ';
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
        <div className="space-y-6 animate-fade-in">
            <div className="bg-[#1e293b] p-6 md:p-8 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative z-10">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic flex items-center gap-3">
                            <span>🌍</span> LIGI ŚWIATA
                        </h2>
                    </div>

                    <div className="flex flex-col items-start xl:items-end gap-3 w-full xl:w-auto">
                        <div className="flex flex-wrap gap-2 bg-[#0f172a] p-1.5 rounded-2xl border border-slate-700 shadow-inner w-full xl:w-auto">
                            {countriesList.map(c => (
                                <button key={c.code} onClick={()=>setSelectedCountry(c.code)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex-1 xl:flex-none justify-center ${selectedCountry===c.code ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                                    <FlagIcon code={c.code} size="sm" /> <span className="hidden md:inline">{c.name}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 bg-[#0f172a] p-1.5 rounded-2xl border border-slate-700 shadow-inner w-full xl:w-auto">
                            {[1, 2, 3].map(lvl => (
                                <button key={lvl} onClick={() => setSelectedLeague(lvl)} className={`flex-1 px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${selectedLeague === lvl ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                                    Liga {lvl}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#1e293b] rounded-3xl overflow-hidden shadow-xl border border-slate-700">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-300 min-w-[750px]">
                        <thead className="bg-[#0f172a] uppercase text-[10px] font-black tracking-widest text-slate-500 border-b border-slate-700">
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
                        <tbody className="divide-y divide-slate-700">
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
const ScheduleView = ({ schedules, teams, myTeamId, currentWeek, calendar }) => {
    const myTeam = teams.find(t => String(t.id) === String(myTeamId));
    if (!myTeam) return <div className="text-center p-10 text-slate-500">Wybierz drużynę.</div>;

    const leagueIdx = (myTeam.league || 1) - 1;
    const leagueSchedule = schedules[leagueIdx];

    if (!leagueSchedule || leagueSchedule.length === 0) {
        return <div className="text-center py-20 text-slate-500 font-medium">Terminarz niedostępny. Zagraj pierwszy sezon!</div>;
    }

    const activeRoundRef = useRef(null);
    useEffect(() => {
        if (activeRoundRef.current) activeRoundRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-700 shadow-xl flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center text-3xl border border-slate-700">📅</div>
                <div className="z-10 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight italic">OFICJALNY KALENDARZ</h2>
                </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {calendar.map((event, index) => {
                    const weekNum = index + 1;
                    const isCurrent = weekNum === currentWeek;
                    const isPast = weekNum < currentWeek;

                    let content = null;

                    if (event.type === 'LEAGUE') {
                        const roundMatches = leagueSchedule[event.round - 1];
                        if (!roundMatches) {
                            content = (
                                <div className="text-center text-slate-500 uppercase tracking-widest py-6 text-xs font-bold bg-[#0f172a] rounded-2xl border border-slate-700">
                                    Pauza w rozgrywkach / Koniec Ligi
                                </div>
                            );
                        } else {
                            content = roundMatches.map((m, mIdx) => {
                            const host = teams.find(t => String(t.id) === String(m.home));
                            const guest = teams.find(t => String(t.id) === String(m.away));
                            const isHostMyTeam = String(m.home) === String(myTeamId);
                            const isGuestMyTeam = String(m.away) === String(myTeamId);
                            const isMyMatch = isHostMyTeam || isGuestMyTeam;
                            const hasScore = m.isPlayed || (m.scoreHome !== undefined && m.scoreHome !== null);

                            if(!host || !guest) return null;

                            return (
                                <div key={mIdx} className={`flex justify-between items-center p-3 rounded-2xl transition-colors ${isMyMatch ? 'bg-[#0f172a] border border-cyan-500/40' : 'hover:bg-[#0f172a] border border-transparent'}`}>
                                    <div className={`w-2/5 text-right truncate text-xs md:text-sm flex items-center justify-end gap-1.5 ${isHostMyTeam ? 'text-cyan-400 font-bold' : isPast ? 'text-slate-300 font-medium' : 'text-slate-400'}`}>
                                        <span className="truncate">{host.name}</span>
                                    </div>
                                    <div className="w-1/5 flex justify-center">
                                        {hasScore ? (
                                            <div className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs border flex items-center gap-1.5 ${isMyMatch ? 'bg-[#1e293b] border-cyan-500/50 text-white' : 'bg-[#0f172a] border-slate-700 text-slate-300'}`}>
                                                <span>{m.scoreHome}</span><span className="text-slate-500 opacity-70">:</span><span>{m.scoreAway}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] font-black text-slate-500 bg-[#0f172a] px-2.5 py-1 rounded-lg border border-slate-700 uppercase tracking-widest">VS</span>
                                        )}
                                    </div>
                                    <div className={`w-2/5 text-left truncate text-xs md:text-sm flex items-center gap-1.5 ${isGuestMyTeam ? 'text-cyan-400 font-bold' : isPast ? 'text-slate-300 font-medium' : 'text-slate-400'}`}>
                                        <span className="truncate">{guest.name}</span>
                                    </div>
                                </div>
                            );
                        });}
                    } else {
                        content = (
                            <div className="flex flex-col items-center justify-center py-6 opacity-70 text-center bg-[#0f172a] rounded-2xl border border-slate-700">
                                <div className="text-4xl mb-2">{event.type === 'CL' ? '⭐' : '🏆'}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{event.name}</div>
                            </div>
                        );
                    }

                    return (
                        <div key={index} ref={isCurrent ? activeRoundRef : null} className={`rounded-3xl overflow-hidden border transition-all duration-500 flex flex-col ${isCurrent ? 'bg-[#1e293b] border-cyan-500 shadow-lg transform scale-[1.02] z-10' : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'}`}>
                            <div className={`p-4 font-black flex justify-between items-center border-b uppercase tracking-widest text-xs ${isCurrent ? 'bg-[#0f172a] border-cyan-500/50 text-cyan-400' : 'bg-[#0f172a] border-slate-700 text-slate-400'}`}>
                                <span>Tydzień {weekNum}: {event.type === 'LEAGUE' ? `Kolejka ${event.round}` : event.name}</span>
                                {isCurrent && <span className="bg-cyan-600 text-white px-3 py-1 rounded-lg text-[9px] font-black animate-pulse">TERAZ GRAMY</span>}
                            </div>
                            <div className="p-3 space-y-1.5 flex-1">
                                {content}
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
const ManagerContractModal = ({ team, onAccept, onDecline, managerData }) => {
    const [years, setYears] = useState(2);
    
    // Obliczanie oczekiwań na podstawie siły i ligi
    const expectedPos = team.league === 1 ? 4 : team.league === 2 ? 8 : 14;
    
    // Podstawowa pensja menedżera (zależna od ligi i długości umowy)
    const baseWage = team.league === 1 ? 150000 : team.league === 2 ? 40000 : 10000;
    const finalWage = Math.floor(baseWage * (1 + (years * 0.1)) * (1 + ((managerData?.skills?.negotiator || 0) * 0.05)));

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-md p-6">
            <div className="bg-[#1e293b] border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🤝</div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-wider">Oferta Kontraktu</h2>
                    <p className="text-slate-400 mt-2">Zarząd <span className="text-cyan-400 font-bold">{team.name}</span> przygotował wstępną umowę.</p>
                </div>

                <div className="bg-[#0f172a] p-6 rounded-2xl border border-white/5 space-y-6 mb-8">
                    <div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Długość Kontraktu:</div>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(y => (
                                <button 
                                    key={y} 
                                    onClick={() => setYears(y)}
                                    className={`flex-1 py-3 rounded-xl font-black transition-all ${years === y ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                >
                                    {y} {y === 1 ? 'Rok' : 'Lata'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-700 pt-4">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Twoja Pensja:</span>
                        <span className="text-xl font-mono font-black text-emerald-400">{formatMoney(finalWage)} / sezon</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-700 pt-4">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Cel Zarządu:</span>
                        <span className="text-sm font-black text-white">Miejsce w TOP {expectedPos}</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={onDecline} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl font-black uppercase tracking-widest transition-colors">
                        Odrzuć Ofertę
                    </button>
                    <button 
                        onClick={() => onAccept({ years, wage: finalWage, expectedPos })} 
                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-colors"
                    >
                        Podpisz Umowę
                    </button>
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

// --- NOWOŚĆ: KREATOR MENEDŻERA (START GRY) ---
const ManagerSelectionModal = ({ onSelect }) => {
    const [candidates, setCandidates] = useState([]);

    useEffect(() => {
        const generateRandomManager = () => {
            const firstNames = ['Michał', 'Tomasz', 'Piotr', 'Krzysztof', 'Jan', 'Jakub', 'Jurgen', 'Pep', 'Carlo', 'Jose'];
            const lastNames = ['Kowalski', 'Nowak', 'Klopp', 'Guardiola', 'Ancelotti', 'Mourinho', 'Smuda', 'Probierz'];
            const avatars = ['👨‍💼', '🧔‍♂️', '👨‍🦳', '👱‍♂️', '🤵‍♂️', '😎'];
            const styles = [
                { id: 'offensive', name: 'Ofensywa', icon: '🔥', desc: 'Twoja drużyna tworzy więcej sytuacji strzeleckich.' },
                { id: 'defensive', name: 'Murarz', icon: '🧱', desc: 'Twoja drużyna skuteczniej zapobiega utracie goli.' },
                { id: 'negotiator', name: 'Rekin Biznesu', icon: '🤝', desc: 'Zyskujesz przewagę i lepsze ceny podczas negocjacji transferowych.' }
            ];
            return {
                id: Math.random().toString(36).substr(2, 9),
                name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
                avatar: avatars[Math.floor(Math.random() * avatars.length)],
                style: styles[Math.floor(Math.random() * styles.length)]
            };
        };
        // Generujemy 3 opcje
        setCandidates([generateRandomManager(), generateRandomManager(), generateRandomManager()]);
    }, []);

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent pointer-events-none"></div>
            <div className="text-center w-full max-w-5xl relative z-10 animate-scale-in">
                <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] uppercase">
                    Wybierz Menedżera
                </h1>
                <p className="text-slate-400 mb-12 text-lg font-medium">
                    Twój styl trenerski zdefiniuje przyszłość tego klubu. Kim jesteś?
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {candidates.map((mgr, idx) => (
                        <div key={idx} onClick={() => onSelect(mgr)} className="bg-slate-900/80 border border-slate-700 rounded-3xl p-8 cursor-pointer hover:-translate-y-2 hover:border-purple-500 hover:shadow-[0_20px_50px_rgba(168,85,247,0.3)] transition-all duration-300 group flex flex-col items-center">
                            <div className="text-7xl mb-6 bg-slate-800 w-32 h-32 rounded-full flex items-center justify-center border-4 border-slate-600 group-hover:border-purple-500 shadow-inner transition-colors">
                                {mgr.avatar}
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">{mgr.name}</h2>
                            
                            <div className="bg-slate-950 px-4 py-4 rounded-xl border border-white/5 w-full mt-4 flex-1 flex flex-col">
                                <div className="text-sm font-black text-slate-300 uppercase tracking-widest mb-3 flex items-center justify-center gap-2 border-b border-white/5 pb-3">
                                    <span className="text-2xl">{mgr.style.icon}</span> {mgr.style.name}
                                </div>
                                <p className="text-xs text-slate-500 font-bold leading-relaxed">{mgr.style.desc}</p>
                            </div>
                            
                            <button className="mt-6 w-full bg-slate-800 text-slate-400 font-black uppercase tracking-widest py-3 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors border border-transparent group-hover:border-purple-400 shadow-lg">
                                Wybieram
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
// --- NOWOŚĆ: WYDARZENIA FABULARNE (WYBORY) ---
const StoryEventModal = ({ event, onResolve, budget }) => {
    const currentBudget = Number(budget) || 0;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-sm p-6">
            <div className="bg-slate-900 border border-slate-600 w-full max-w-3xl rounded-[2rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] p-8 md:p-12 animate-scale-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="text-center mb-8 relative z-10">
                    <div className="text-6xl mb-4 animate-bounce drop-shadow-md">📰</div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic drop-shadow-md border-b-2 border-red-500/50 pb-4 inline-block">
                        {event.title}
                    </h2>
                    <p className="text-slate-300 mt-6 text-lg md:text-xl font-medium leading-relaxed bg-slate-950/60 p-6 rounded-2xl border border-white/5 shadow-inner">
                        {event.desc}
                    </p>
                    
                    {/* WIDOCZNY STAN KONTA W GAZECIE */}
                    <div className="mt-6 inline-block bg-slate-950 px-6 py-2 rounded-xl border border-yellow-500/30 text-yellow-400 font-bold font-mono text-lg shadow-inner">
                        Budżet klubu: {formatMoney(currentBudget)}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {event.choices.map((choice, idx) => {
                        const cost = choice.budgetChange ? Number(choice.budgetChange) : 0;
                        const isTooExpensive = cost < 0 && currentBudget < Math.abs(cost);

                        // JEŚLI NAS NIE STAĆ - Renderujemy MARTWY KWADRAT, a nie przycisk!
                        if (isTooExpensive) {
                            return (
                                <div key={idx} className="bg-slate-950 border-2 border-red-900/50 p-6 rounded-2xl flex flex-col items-center text-center opacity-50 cursor-not-allowed grayscale">
                                    <span className="text-xl font-black mb-4 leading-tight text-slate-500">{choice.text}</span>
                                    <div className="mt-auto w-full bg-red-950/80 border border-red-900 py-2.5 rounded-lg text-xs text-red-500 font-black uppercase tracking-widest shadow-inner flex items-center justify-center gap-2">
                                        <span>❌ Brak środków</span>
                                        <span className="text-[10px] opacity-80">(Koszt: {formatMoney(Math.abs(cost))})</span>
                                    </div>
                                </div>
                            );
                        }

                        // JEŚLI NAS STAĆ - Zwykły klikalny guzik
                        return (
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
                                    {choice.suspensionChange !== undefined && choice.suspensionChange > 0 && (
                                        <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black border bg-red-900/50 text-red-400 border-red-500/30 animate-pulse">
                                            Zawieszenie {choice.suspensionChange} mecz
                                        </span>
                                    )}
                                    {choice.potentialChange !== undefined && choice.potentialChange > 0 && (
                                        <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black border bg-cyan-900/50 text-cyan-400 border-cyan-500/30">
                                            Potencjał +{choice.potentialChange}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
export default App;