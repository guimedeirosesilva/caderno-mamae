import React, { useState, useEffect } from 'react';
import {
  PlusCircle, Trash2, CheckCircle, Wallet,
  TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight, Cloud, Loader2, LogOut, Lock, FileText, ShieldAlert, Edit3, X, Save, PiggyBank, Landmark
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query
} from 'firebase/firestore';

// --- INSTRUÇÕES PARA O SEU VSCODE (PDF) ---
// Se você instalou 'jspdf' via npm, DESCOMENTE as duas linhas abaixo para melhor performance:
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

// --- LISTA VIP (SEGURANÇA) ---
const EMAILS_PERMITIDOS = [
  "guimedeirosesilva@gmail.com",
  "elaineeemedeiros@gmail.com",
  "homeroohs@gmail.com",
  "fernandomedeiros90@gmail.com"
];

// --- Configuração do Firebase (Automática) ---
let firebaseConfig;

try {
  // Tenta pegar as chaves do arquivo .env (Vercel/Local)
  if (import.meta.env && import.meta.env.VITE_API_KEY) {
    firebaseConfig = {
      apiKey: import.meta.env.VITE_API_KEY,
      authDomain: import.meta.env.VITE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_APP_ID
    };
  }
} catch (e) {
  // Ignora erro se import.meta não existir (ambiente de teste)
}

// Se não achou as chaves acima, tenta configuração interna (Preview do Chat)
if (!firebaseConfig) {
  firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : { apiKey: "demo-mode", projectId: "demo-project" };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'app-mamae-deploy';

// --- Componente de Gráfico ---
const GraficoMensal = ({ entradas, saidas, investido }) => {
  // Para o gráfico, consideramos 'saidas' como gastos + investimentos (dinheiro que saiu da mão)
  const totalSaidaReal = saidas + investido;
  const total = entradas + totalSaidaReal;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center">
          <span className="text-xs text-slate-400 font-medium">Sem dados</span>
        </div>
      </div>
    );
  }
  const raio = 40;
  const circunferencia = 2 * Math.PI * raio;
  const percentualEntrada = (entradas / total) * 100;
  const offsetEntrada = circunferencia - ((percentualEntrada / 100) * circunferencia);

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative w-40 h-40">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
          {/* Fundo Vermelho (Saídas) */}
          <circle cx="50" cy="50" r={raio} fill="transparent" stroke="#F43F5E" strokeWidth="12" />
          {/* Frente Verde (Entradas) */}
          <circle
            cx="50" cy="50" r={raio}
            fill="transparent"
            stroke="#10B981"
            strokeWidth="12"
            strokeDasharray={circunferencia}
            strokeDashoffset={offsetEntrada}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
          <span className="text-xs font-bold uppercase text-slate-400">Movimento</span>
          <span className="text-sm font-bold">{Math.round(percentualEntrada)}% Entrou</span>
        </div>
      </div>
      {/* Legenda Simplificada */}
      <div className="flex justify-center gap-3 mt-2 text-[10px] font-bold">
        <div className="flex items-center gap-1 text-emerald-600">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Entrou
        </div>
        <div className="flex items-center gap-1 text-rose-600">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div> Saiu
        </div>
        <div className="flex items-center gap-1 text-amber-600">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div> Guardou
        </div>
      </div>
    </div>
  );
};

// --- Componente de Login ---
const LoginScreen = ({ onLoginGoogle, loading, erroPermissao }) => (
  <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white text-center">
    <div className="bg-white/10 p-6 rounded-full mb-6 backdrop-blur-sm">
      <Wallet className="w-16 h-16" />
    </div>
    <h1 className="text-3xl font-bold mb-2">Caderno da Mamãe</h1>
    <p className="text-indigo-100 mb-10 max-w-xs mx-auto">
      Controle as contas da loja de forma simples, segura e automática.
    </p>

    {erroPermissao && (
      <div className="mb-6 bg-red-500/20 border border-red-400 p-4 rounded-xl flex items-center gap-3 text-left animate-pulse">
        <ShieldAlert className="w-8 h-8 text-red-200 shrink-0" />
        <p className="text-sm text-red-100">
          <b>Acesso Negado:</b> Este e-mail não tem permissão para usar o aplicativo.
        </p>
      </div>
    )}

    <div className="w-full max-w-sm space-y-4">
      <button
        onClick={onLoginGoogle}
        disabled={loading}
        className="w-full bg-white text-indigo-900 font-bold py-4 rounded-2xl shadow-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-3"
      >
        {loading ? <Loader2 className="animate-spin" /> : (
          <>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            Entrar com Google
          </>
        )}
      </button>

      <p className="text-xs text-indigo-300 mt-6 flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Acesso restrito à família.
      </p>
    </div>
  </div>
);

// --- Componente Principal ---
export default function CadernoDigital() {
  const [user, setUser] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [erroPermissao, setErroPermissao] = useState(false);

  // Estados de Visualização
  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());
  // Tipos: 'entrada', 'saida', 'investimento'
  const [tipo, setTipo] = useState('saida');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataForm, setDataForm] = useState(new Date().toISOString().substr(0, 10));
  const [filtro, setFiltro] = useState('todos');
  const [salvando, setSalvando] = useState(false);

  // Estado para Edição
  const [itemEmEdicao, setItemEmEdicao] = useState(null);

  // Controle de carregamento de PDF
  const [pdfLibsLoaded, setPdfLibsLoaded] = useState(false);

  // Carrega PDF via CDN apenas se não foi importado (Fallback)
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.jspdf) {
      const loadScript = (src) => new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        document.body.appendChild(script);
      });
      Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js')
      ]).then(() => setPdfLibsLoaded(true));
    } else {
      setPdfLibsLoaded(true);
    }
  }, []);

  // 1. Autenticação com VERIFICAÇÃO DE E-MAIL
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        const emailUsuario = u.email ? u.email.toLowerCase() : '';
        const emailsPermitidosLower = EMAILS_PERMITIDOS.map(e => e.toLowerCase());

        if (emailsPermitidosLower.includes(emailUsuario) || u.isAnonymous) {
          setUser(u);
          setErroPermissao(false);
        } else {
          await signOut(auth);
          setUser(null);
          setErroPermissao(true);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Conexão com Banco de Dados
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transacoes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => new Date(b.data) - new Date(a.data));
      setTransacoes(docs);
    }, (error) => console.error("Erro ao buscar:", error));
    return () => unsubscribe();
  }, [user]);

  // --- Ações de Login e Helpers ---
  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setErroPermissao(false);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro login Google:", error);
      alert("Erro ao conectar com Google. Tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja sair do aplicativo?")) {
      await signOut(auth);
    }
  };

  const getPrimeiroNome = () => {
    if (!user || !user.displayName) return 'Visitante';
    return user.displayName.split(' ')[0];
  };

  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // --- Funções do App ---
  const navegarMes = (direcao) => {
    const novaData = new Date(dataVisualizacao);
    novaData.setMonth(dataVisualizacao.getMonth() + direcao);
    setDataVisualizacao(novaData);
  };

  const adicionarTransacao = async (e) => {
    e.preventDefault();
    if (!descricao || !valor || !user) return;
    setSalvando(true);

    // Investimentos entram como "pago: true" automaticamente (dinheiro saiu do caixa)
    const isPago = tipo === 'entrada' || tipo === 'investimento';

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transacoes'), {
        tipo,
        descricao,
        valor: parseFloat(valor),
        data: dataForm,
        pago: isPago,
        observacoes: "",
        criadoEm: new Date().toISOString()
      });
      setDescricao(''); setValor('');
    } catch (err) { alert("Erro ao salvar."); }
    setSalvando(false);
  };

  const alternarStatus = async (item) => {
    if (!user) return;
    // Investimentos geralmente não "despagam", mas permitimos se for erro
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'transacoes', item.id);
    await updateDoc(docRef, { pago: !item.pago });
  };

  const removerTransacao = async (id) => {
    if (!user) return;
    if (window.confirm('Apagar esta anotação permanentemente?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transacoes', id));
    }
  };

  // --- Salvar Edição ---
  const salvarEdicao = async (e) => {
    e.preventDefault();
    if (!user || !itemEmEdicao) return;

    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'transacoes', itemEmEdicao.id);
      await updateDoc(docRef, {
        descricao: itemEmEdicao.descricao,
        valor: parseFloat(itemEmEdicao.valor),
        data: itemEmEdicao.data,
        observacoes: itemEmEdicao.observacoes || ""
      });
      setItemEmEdicao(null);
    } catch (err) {
      console.error("Erro ao editar:", err);
      alert("Erro ao salvar alterações.");
    }
  };

  // --- CÁLCULOS DO MÊS ---
  const nomeDoMes = dataVisualizacao.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const mesAtual = dataVisualizacao.getMonth();
  const anoAtual = dataVisualizacao.getFullYear();

  const transacoesDoMes = transacoes.filter(t => {
    const [ano, mes] = t.data.split('-').map(Number);
    return ano === anoAtual && mes === (mesAtual + 1);
  });

  const totalEntradas = transacoesDoMes.filter(t => t.tipo === 'entrada').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidasPagas = transacoesDoMes.filter(t => t.tipo === 'saida' && t.pago).reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidasPendentes = transacoesDoMes.filter(t => t.tipo === 'saida' && !t.pago).reduce((acc, curr) => acc + curr.valor, 0);

  // Investimento conta como dinheiro que saiu do "Caixa Diário", mas foi guardado
  const totalInvestidoMes = transacoesDoMes.filter(t => t.tipo === 'investimento').reduce((acc, curr) => acc + curr.valor, 0);

  // Saldo do Mês = Entradas - (Saídas Pagas + Investimentos feitos)
  const saldoDoMes = totalEntradas - totalSaidasPagas - totalInvestidoMes;

  // --- CÁLCULOS TOTAIS (ACUMULADO) ---
  const saldoTotalAcumulado = transacoes.reduce((acc, t) => {
    if (t.tipo === 'entrada') return acc + t.valor;
    if (t.tipo === 'saida' && t.pago) return acc - t.valor;
    if (t.tipo === 'investimento') return acc - t.valor; // Sai do caixa
    return acc;
  }, 0);

  const totalGuardadoGeral = transacoes.filter(t => t.tipo === 'investimento').reduce((acc, curr) => acc + curr.valor, 0);

  const formatarMoeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarDataDia = (d) => d.split('-')[2];
  const formatarDataBr = (d) => {
    const [ano, mes, dia] = d.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const listaFinal = transacoesDoMes.filter(t => {
    if (filtro === 'todos') return true;
    if (filtro === 'entradas') return t.tipo === 'entrada';
    if (filtro === 'saidas') return t.tipo === 'saida';
    if (filtro === 'investimentos') return t.tipo === 'investimento';
    return true;
  });

  // --- GERADOR DE PDF ---
  const gerarRelatorioPDF = () => {
    try {
      const jsPDFConstructor = window.jspdf ? window.jspdf.jsPDF : null;
      if (!jsPDFConstructor) {
        alert("Erro: Biblioteca PDF não carregada. Verifique os imports no código.");
        return;
      }
      const doc = new jsPDFConstructor();

      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229);
      doc.text(`Relatório Financeiro - ${nomeDoMes}`, 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Gerado por: ${getPrimeiroNome()}`, 14, 27);

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Entradas (Mês): ${formatarMoeda(totalEntradas)}`, 14, 37);
      doc.text(`Contas Pagas (Mês): ${formatarMoeda(totalSaidasPagas)}`, 14, 43);
      doc.text(`Guardado/Investido (Mês): ${formatarMoeda(totalInvestidoMes)}`, 14, 49);
      doc.text(`Saldo Livre no Mês: ${formatarMoeda(saldoDoMes)}`, 14, 55);

      doc.setTextColor(217, 119, 6); // Cor Amber
      doc.text(`Total Guardado (Geral): ${formatarMoeda(totalGuardadoGeral)}`, 14, 65);

      const tabelaDados = listaFinal.map(item => [
        formatarDataBr(item.data),
        item.descricao,
        item.tipo === 'entrada' ? 'Entrada' : (item.tipo === 'investimento' ? 'Guardado' : 'Saída'),
        item.tipo === 'saida' ? (item.pago ? 'Pago' : 'Pendente') : (item.tipo === 'investimento' ? 'Depositado' : '-'),
        formatarMoeda(item.valor),
        item.observacoes || '-'
      ]);

      doc.autoTable({
        startY: 70,
        head: [['Data', 'Descrição', 'Tipo', 'Status', 'Valor', 'Obs']],
        body: tabelaDados,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        columnStyles: { 4: { fontStyle: 'bold', halign: 'right' } }
      });

      doc.save(`relatorio_${nomeDoMes.replace(' ', '_')}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF", err);
      alert("Erro ao gerar PDF.");
    }
  };

  if (loading) return <div className="min-h-screen bg-indigo-600 flex items-center justify-center"><Loader2 className="text-white animate-spin w-8 h-8" /></div>;

  if (!user) {
    return <LoginScreen onLoginGoogle={handleGoogleLogin} loading={loginLoading} erroPermissao={erroPermissao} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* Cabeçalho */}
      <header className="bg-indigo-600 text-white pb-8 pt-6 shadow-lg rounded-b-[2.5rem] mb-6 relative z-10">
        <div className="max-w-md mx-auto px-4">

          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-medium text-indigo-200 block mb-0.5 animate-in fade-in slide-in-from-bottom-2 duration-700">
                {getSaudacao()}, {getPrimeiroNome()}!
              </span>
              <h1 className="font-bold flex items-center gap-2 text-lg opacity-90">
                <Wallet className="w-5 h-5" />
                Controle da Mamãe
              </h1>
            </div>

            <div className="flex gap-2">
              <button
                onClick={gerarRelatorioPDF}
                title="Baixar PDF"
                className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-full transition-colors"
              >
                <FileText className="w-4 h-4 text-white" />
              </button>
              <button onClick={handleLogout} title="Sair" className="p-2 bg-indigo-700 hover:bg-indigo-800 rounded-full transition-colors">
                <LogOut className="w-4 h-4 text-indigo-200" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center bg-indigo-700 rounded-full px-1 p-1 shadow-inner border border-indigo-500/30">
              <button onClick={() => navegarMes(-1)} className="p-1 hover:bg-indigo-500 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5 text-indigo-100" />
              </button>
              <span className="mx-3 font-bold text-sm capitalize min-w-[100px] text-center">
                {nomeDoMes}
              </span>
              <button onClick={() => navegarMes(1)} className="p-1 hover:bg-indigo-500 rounded-full transition-colors">
                <ChevronRight className="w-5 h-5 text-indigo-100" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">

            {/* Card Saldo do Mês */}
            <div className="bg-white text-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Caixa do Mês
                  </span>
                  <div className={`text-3xl font-bold mb-2 ${saldoDoMes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatarMoeda(saldoDoMes)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Cloud className="w-3 h-3 text-emerald-500" />
                    Dinheiro livre
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <GraficoMensal entradas={totalEntradas} saidas={totalSaidasPagas} investido={totalInvestidoMes} />
                </div>
              </div>
            </div>

            {/* Grid de Informações: Entrou | Pago | Guardado */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-500/20 bg-opacity-25 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex flex-col justify-center items-center text-center h-20">
                <span className="text-[10px] font-bold text-emerald-100 uppercase mb-1">Entrou</span>
                <span className="text-sm font-bold text-white leading-tight">{formatarMoeda(totalEntradas)}</span>
              </div>
              <div className="bg-rose-500/20 bg-opacity-25 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex flex-col justify-center items-center text-center h-20">
                <span className="text-[10px] font-bold text-rose-100 uppercase mb-1">Falta</span>
                <span className="text-sm font-bold text-white leading-tight">{formatarMoeda(totalSaidasPendentes)}</span>
              </div>
              <div className="bg-amber-500/20 bg-opacity-25 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex flex-col justify-center items-center text-center h-20">
                <span className="text-[10px] font-bold text-amber-100 uppercase mb-1">Guardado</span>
                <span className="text-sm font-bold text-white leading-tight">{formatarMoeda(totalInvestidoMes)}</span>
              </div>
            </div>

            {/* Cards de Saldo Total (Acumulado) e Investimentos Totais */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-indigo-800/50 backdrop-blur-md border border-indigo-400/30 rounded-2xl p-3 flex flex-col justify-center">
                <span className="text-[10px] text-indigo-200 font-bold uppercase block mb-1">Caixa Geral (Total)</span>
                <span className="text-base font-bold text-white">{formatarMoeda(saldoTotalAcumulado)}</span>
              </div>
              <div className="bg-amber-500/20 backdrop-blur-md border border-amber-400/30 rounded-2xl p-3 flex flex-col justify-center relative overflow-hidden">
                <PiggyBank className="w-12 h-12 text-amber-300 absolute -right-3 -bottom-3 opacity-30 rotate-12" />
                <span className="text-[10px] text-amber-100 font-bold uppercase block mb-1">Caixinhas (Total)</span>
                <span className="text-base font-bold text-white relative z-10">{formatarMoeda(totalGuardadoGeral)}</span>
              </div>
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-28 -mt-4 relative z-20">
        <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-full shadow-sm border border-slate-100 inline-flex overflow-x-auto max-w-full">
            {['todos', 'entradas', 'saidas', 'investimentos'].map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all capitalize whitespace-nowrap
                  ${filtro === f
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-50'
                  }`}
              >
                {f === 'investimentos' ? 'Guardado' : (f === 'todos' ? 'Tudo' : f)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {listaFinal.length === 0 ? (
            <div className="text-center py-12 px-6 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-300">
                <Calendar className="w-8 h-8" />
              </div>
              <p className="text-slate-500 font-medium">Nenhuma anotação neste filtro.</p>
            </div>
          ) : (
            listaFinal.map((item) => (
              <div
                key={item.id}
                className={`relative overflow-hidden bg-white p-4 rounded-2xl shadow-sm border transition-all flex items-center gap-3 group
                  ${item.tipo === 'entrada' ? 'border-emerald-100' : (
                    item.tipo === 'investimento' ? 'border-amber-100 bg-amber-50/20' : (
                      item.pago ? 'border-blue-100 bg-blue-50/30' : 'border-rose-100'
                    )
                  )}
                `}
              >
                <div className="flex flex-col items-center justify-center pr-3 border-r border-slate-100 min-w-[3rem]">
                  <span className="text-lg font-bold text-slate-700">{formatarDataDia(item.data)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Dia</span>
                </div>

                <div>
                  {item.tipo === 'entrada' && (
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  )}
                  {item.tipo === 'investimento' && (
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                  )}
                  {item.tipo === 'saida' && (
                    <button
                      onClick={() => alternarStatus(item)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                        ${item.pago
                          ? 'bg-blue-100 text-blue-500 hover:bg-blue-200'
                          : 'bg-rose-100 text-rose-500 hover:bg-rose-200 shadow-sm'}
                      `}
                    >
                      {item.pago ? <CheckCircle className="w-5 h-5" /> : <div className="w-4 h-4 border-2 border-current rounded-md"></div>}
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate text-slate-800 ${item.pago && item.tipo === 'saida' ? 'line-through text-blue-900/40' : ''}`}>
                    {item.descricao}
                  </p>
                  <p className={`text-xs flex items-center gap-1 
                    ${item.tipo === 'investimento' ? 'text-amber-600 font-medium' : (item.pago && item.tipo === 'saida' ? 'text-blue-400' : 'text-slate-400')}`}>
                    {item.tipo === 'saida' && (item.pago ? 'Pago' : 'Pendente')}
                    {item.tipo === 'entrada' && 'Recebido'}
                    {item.tipo === 'investimento' && 'Guardado'}
                  </p>
                  {item.observacoes && (
                    <p className="text-[10px] text-slate-400 mt-1 italic truncate max-w-[150px]">
                      obs: {item.observacoes}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className={`font-bold font-mono text-sm 
                    ${item.tipo === 'entrada' ? 'text-emerald-600' : (
                      item.tipo === 'investimento' ? 'text-amber-600' : (
                        item.pago ? 'text-blue-400' : 'text-rose-600'
                      )
                    )}`}>
                    {item.tipo === 'entrada' ? '+' : '-'}{formatarMoeda(item.valor)}
                  </div>

                  <div className="flex justify-end gap-1 mt-1">
                    <button
                      onClick={() => setItemEmEdicao(item)}
                      className="text-slate-300 hover:text-indigo-500 transition-colors p-1"
                      title="Editar e ver detalhes"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removerTransacao(item.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* --- MODAL DE EDIÇÃO --- */}
      {itemEmEdicao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setItemEmEdicao(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-500" />
              Editar Detalhes
            </h3>

            <form onSubmit={salvarEdicao} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 ml-1">Descrição</label>
                <input
                  type="text"
                  value={itemEmEdicao.descricao}
                  onChange={(e) => setItemEmEdicao({ ...itemEmEdicao, descricao: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 ml-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemEmEdicao.valor}
                    onChange={(e) => setItemEmEdicao({ ...itemEmEdicao, valor: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 ml-1">Data</label>
                  <input
                    type="date"
                    value={itemEmEdicao.data}
                    onChange={(e) => setItemEmEdicao({ ...itemEmEdicao, data: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 ml-1">Observações (Banco, Juros, etc)</label>
                <textarea
                  rows="3"
                  value={itemEmEdicao.observacoes || ""}
                  onChange={(e) => setItemEmEdicao({ ...itemEmEdicao, observacoes: e.target.value })}
                  placeholder="Ex: Pago no banco X com juros..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                ></textarea>
              </div>

              <button
                type="submit"
                className="bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-200"
              >
                <Save className="w-5 h-5" />
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Formulário Fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-md mx-auto">
          <form onSubmit={adicionarTransacao} className="flex flex-col gap-3">
            {/* BOTÕES DE TIPO */}
            <div className="flex gap-2 justify-center">
              <div className="flex bg-slate-100 rounded-xl p-1 shrink-0 gap-1">
                <button type="button" onClick={() => setTipo('entrada')} className={`p-3 rounded-lg transition-all ${tipo === 'entrada' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`} title="Entrada">
                  <TrendingUp className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => setTipo('saida')} className={`p-3 rounded-lg transition-all ${tipo === 'saida' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'}`} title="Saída">
                  <TrendingDown className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => setTipo('investimento')} className={`p-3 rounded-lg transition-all ${tipo === 'investimento' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`} title="Guardar/Investir">
                  <PiggyBank className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                placeholder={tipo === 'investimento' ? "Onde? (Ex: Nubank, Cofre)" : "Nome (Ex: Luz, Bolo)"}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none focus:border-indigo-500 min-w-0"
                required
              />
            </div>

            {/* LINHA DE VALOR E DATA */}
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 text-center font-mono focus:outline-none focus:border-indigo-500 text-lg font-bold"
                required
              />
              <input
                type="date"
                value={dataForm}
                onChange={(e) => setDataForm(e.target.value)}
                className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-2 text-center text-sm text-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" disabled={salvando} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shadow-md disabled:opacity-50 flex items-center justify-center w-14 shrink-0">
                {salvando ? <Loader2 className="w-6 h-6 animate-spin" /> : <PlusCircle className="w-6 h-6" />}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="h-32"></div>
    </div>
  );
}