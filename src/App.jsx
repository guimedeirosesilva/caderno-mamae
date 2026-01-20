import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, Trash2, CheckCircle, Wallet, 
  TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight, Cloud, Loader2, LogOut, Lock, FileText
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query 
} from 'firebase/firestore';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Configuração do Firebase ---
// No seu projeto local (VSCode), você deve usar as variáveis de ambiente.
// Abaixo está o código adaptado para não dar erro aqui no chat.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'app-mamae-deploy';

// --- Componente de Gráfico ---
const GraficoMensal = ({ entradas, saidas }) => {
  const total = entradas + saidas;
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
          <circle cx="50" cy="50" r={raio} fill="transparent" stroke="#F43F5E" strokeWidth="12" />
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
      <div className="flex gap-4 mt-2 text-xs font-bold">
        <div className="flex items-center gap-1 text-emerald-600">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          Entradas
        </div>
        <div className="flex items-center gap-1 text-rose-600">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          Saídas
        </div>
      </div>
    </div>
  );
};

// --- Componente de Login (LIMPO - SEM BOTÃO ANÔNIMO) ---
const LoginScreen = ({ onLoginGoogle, loading }) => (
  <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white text-center">
    <div className="bg-white/10 p-6 rounded-full mb-6 backdrop-blur-sm">
      <Wallet className="w-16 h-16" />
    </div>
    <h1 className="text-3xl font-bold mb-2">Caderno da Mamãe</h1>
    <p className="text-indigo-100 mb-10 max-w-xs mx-auto">
      Controle as contas da loja de forma simples, segura e automática.
    </p>

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
        <Lock className="w-3 h-3" /> Seus dados são salvos com segurança.
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
  
  // Estados de Visualização
  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());
  const [tipo, setTipo] = useState('saida'); 
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataForm, setDataForm] = useState(new Date().toISOString().substr(0, 10));
  const [filtro, setFiltro] = useState('todos'); 
  const [salvando, setSalvando] = useState(false);
  
  // Estado para controlar carregamento do PDF no modo preview
  const [pdfLibsLoaded, setPdfLibsLoaded] = useState(false);

  // Carrega bibliotecas PDF via CDN para o PREVIEW (não necessário se usar npm install localmente)
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    // Só carrega via CDN se window.jspdf não existir (ou seja, não foi importado via npm)
    if (!window.jspdf) {
      Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js')
      ]).then(() => setPdfLibsLoaded(true)).catch(() => console.log('Erro CDN PDF'));
    } else {
      setPdfLibsLoaded(true);
    }
  }, []);

  // 1. Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    const autoLoginPreview = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
         await signInWithCustomToken(auth, __initial_auth_token);
      }
    };
    autoLoginPreview();

    return () => unsubscribe();
  }, []);

  // 2. Conexão com Banco de Dados
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transacoes'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      docs.sort((a, b) => new Date(b.data) - new Date(a.data));
      setTransacoes(docs);
    }, (error) => {
      console.error("Erro ao buscar:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Ações de Login ---
  const handleGoogleLogin = async () => {
    setLoginLoading(true);
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
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transacoes'), {
        tipo,
        descricao,
        valor: parseFloat(valor),
        data: dataForm,
        pago: tipo === 'entrada' ? true : false,
        criadoEm: new Date().toISOString()
      });
      setDescricao('');
      setValor('');
    } catch (err) { alert("Erro ao salvar."); }
    setSalvando(false);
  };

  const alternarStatus = async (item) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'transacoes', item.id);
    await updateDoc(docRef, { pago: !item.pago });
  };

  const removerTransacao = async (id) => {
    if (!user) return;
    if (window.confirm('Apagar esta anotação permanentemente?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transacoes', id));
    }
  };

  // --- Cálculos ---
  const nomeDoMes = dataVisualizacao.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const mesAtual = dataVisualizacao.getMonth();
  const anoAtual = dataVisualizacao.getFullYear();

  const transacoesDoMes = transacoes.filter(t => {
    const [ano, mes] = t.data.split('-').map(Number);
    return ano === anoAtual && mes === (mesAtual + 1);
  });

  const totalEntradas = transacoesDoMes.filter(t => t.tipo === 'entrada').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidasGeral = transacoesDoMes.filter(t => t.tipo === 'saida').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidasPagas = transacoesDoMes.filter(t => t.tipo === 'saida' && t.pago).reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidasPendentes = transacoesDoMes.filter(t => t.tipo === 'saida' && !t.pago).reduce((acc, curr) => acc + curr.valor, 0);
  const saldoDoMes = totalEntradas - totalSaidasPagas;

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
    return true;
  });

  // --- GERADOR DE PDF ---
  const gerarRelatorioPDF = () => {
    // Tenta usar a versão importada (local) ou a versão CDN (preview)
    const jsPDFClass = window.jspdf ? window.jspdf.jsPDF : null; // Se estiver usando import local, descomentar imports lá em cima
    
    // NOTA PARA VSCODE: Se você descomentou "import jsPDF from 'jspdf'", 
    // substitua a linha acima e abaixo por: const doc = new jsPDF();
    
    if (!jsPDFClass && !window.jspdf) {
      alert("Biblioteca PDF carregando ou não encontrada. Se estiver local, verifique os imports.");
      return;
    }

    // Instancia o PDF (adaptando se for CDN ou Import normal)
    const doc = jsPDFClass ? new jsPDFClass() : new window.jspdf.jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(`Relatório Financeiro - ${nomeDoMes}`, 14, 22);
    
    // Resumo
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Entradas: ${formatarMoeda(totalEntradas)}`, 14, 32);
    doc.text(`Saídas: ${formatarMoeda(totalSaidasGeral)}`, 14, 38);
    doc.text(`Saldo Final: ${formatarMoeda(saldoDoMes)}`, 14, 44);

    // Tabela
    const tabelaDados = listaFinal.map(item => [
      formatarDataBr(item.data),
      item.descricao,
      item.tipo === 'entrada' ? 'Entrada' : 'Saída',
      item.tipo === 'saida' ? (item.pago ? 'Pago' : 'Pendente') : '-',
      formatarMoeda(item.valor)
    ]);

    // Chama o autoTable (compatível com CDN ou Import)
    doc.autoTable({
      startY: 50,
      head: [['Data', 'Descrição', 'Tipo', 'Status', 'Valor']],
      body: tabelaDados,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10 },
      columnStyles: {
        4: { fontStyle: 'bold', halign: 'right' }
      }
    });

    doc.save(`relatorio_${nomeDoMes.replace(' ', '_')}.pdf`);
  };

  // --- Renderização Condicional ---
  if (loading) return <div className="min-h-screen bg-indigo-600 flex items-center justify-center"><Loader2 className="text-white animate-spin w-8 h-8"/></div>;

  if (!user) {
    return <LoginScreen onLoginGoogle={handleGoogleLogin} loading={loginLoading} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Cabeçalho */}
      <header className="bg-indigo-600 text-white pb-8 pt-6 shadow-lg rounded-b-[2.5rem] mb-6 relative z-10">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-bold flex items-center gap-2 text-lg opacity-90">
              <Wallet className="w-5 h-5" />
              Controle da Mamãe
            </h1>
            <div className="flex gap-2">
              <button 
                onClick={gerarRelatorioPDF} 
                title="Baixar PDF" 
                className={`p-2 rounded-full transition-colors ${pdfLibsLoaded ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-indigo-800 opacity-50'}`}
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

          <div className="flex flex-col gap-6">
            <div className="bg-white text-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Saldo ({dataVisualizacao.toLocaleDateString('pt-BR', { month: 'short' })})
                  </span>
                  <div className={`text-3xl font-bold mb-2 ${saldoDoMes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatarMoeda(saldoDoMes)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Cloud className="w-3 h-3 text-emerald-500" />
                    Salvo em: {user.email}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <GraficoMensal entradas={totalEntradas} saidas={totalSaidasGeral} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-500/20 bg-opacity-25 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col justify-between h-24">
                <div className="flex items-center gap-2 text-emerald-100 mb-1">
                  <div className="p-1 bg-emerald-500/20 rounded-lg"><TrendingUp className="w-4 h-4 text-white" /></div>
                  <span className="text-xs font-bold">Total Entrou</span>
                </div>
                <span className="text-xl font-bold text-white">{formatarMoeda(totalEntradas)}</span>
              </div>
              <div className="bg-rose-500/20 bg-opacity-25 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col justify-between h-24">
                 <div className="flex items-center gap-2 text-rose-100 mb-1">
                  <div className="p-1 bg-rose-500/20 rounded-lg"><TrendingDown className="w-4 h-4 text-white" /></div>
                  <span className="text-xs font-bold">Falta Pagar</span>
                </div>
                <span className="text-xl font-bold text-white">{formatarMoeda(totalSaidasPendentes)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-24 -mt-4 relative z-20">
        <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-full shadow-sm border border-slate-100 inline-flex">
            {['todos', 'entradas', 'saidas'].map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize
                  ${filtro === f 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-50'
                  }`}
              >
                {f === 'todos' ? 'Tudo' : f}
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
              <p className="text-slate-500 font-medium">Nenhuma conta ou ganho neste mês.</p>
              <p className="text-slate-400 text-xs mt-1">Use o botão "Nova Anotação" abaixo.</p>
            </div>
          ) : (
            listaFinal.map((item) => (
              <div 
                key={item.id} 
                className={`relative overflow-hidden bg-white p-4 rounded-2xl shadow-sm border transition-all flex items-center gap-3 group
                  ${item.tipo === 'entrada' ? 'border-emerald-100' : 'border-rose-100'}
                  ${item.tipo === 'saida' && item.pago ? 'opacity-60 bg-slate-50' : 'opacity-100'}
                `}
              >
                <div className="flex flex-col items-center justify-center pr-3 border-r border-slate-100 min-w-[3rem]">
                   <span className="text-lg font-bold text-slate-700">{formatarDataDia(item.data)}</span>
                   <span className="text-[10px] text-slate-400 uppercase font-bold">Dia</span>
                </div>

                <div>
                   {item.tipo === 'entrada' ? (
                     <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                       <TrendingUp className="w-5 h-5" />
                     </div>
                   ) : (
                     <button 
                      onClick={() => alternarStatus(item)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                        ${item.pago 
                          ? 'bg-slate-200 text-slate-400' 
                          : 'bg-rose-100 text-rose-500 hover:bg-rose-200 shadow-sm'}
                      `}
                     >
                       {item.pago ? <CheckCircle className="w-5 h-5" /> : <div className="w-4 h-4 border-2 border-current rounded-md"></div>}
                     </button>
                   )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate text-slate-800 ${item.pago && item.tipo === 'saida' ? 'line-through text-slate-400' : ''}`}>
                    {item.descricao}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    {item.tipo === 'saida' && (item.pago ? 'Pago' : 'Pendente')}
                    {item.tipo === 'entrada' && 'Recebido'}
                  </p>
                </div>

                <div className="text-right">
                  <div className={`font-bold font-mono text-sm ${item.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.tipo === 'entrada' ? '+' : '-'}{formatarMoeda(item.valor)}
                  </div>
                  <button 
                    onClick={() => removerTransacao(item.id)}
                    className="mt-1 text-slate-200 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 ml-auto" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-md mx-auto">
          <form onSubmit={adicionarTransacao} className="flex flex-col gap-3">
             <div className="flex gap-2">
                <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
                  <button type="button" onClick={() => setTipo('entrada')} className={`p-3 rounded-lg transition-all ${tipo === 'entrada' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}>
                    <TrendingUp className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => setTipo('saida')} className={`p-3 rounded-lg transition-all ${tipo === 'saida' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'}`}>
                    <TrendingDown className="w-5 h-5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Nome (Ex: Luz, Bolo)"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none focus:border-indigo-500"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="R$"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-2 text-center font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
                <button type="submit" disabled={salvando} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shadow-md disabled:opacity-50 flex items-center justify-center min-w-[50px]">
                  {salvando ? <Loader2 className="w-6 h-6 animate-spin" /> : <PlusCircle className="w-6 h-6" />}
                </button>
             </div>
             <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-emerald-500" />
                  Adicionando em:
                </span>
                <input 
                  type="date" 
                  value={dataForm} 
                  onChange={(e) => setDataForm(e.target.value)}
                  className="text-[10px] bg-transparent text-slate-400 border-none p-0 focus:ring-0 w-24 text-right"
                />
             </div>
          </form>
        </div>
      </div>
      <div className="h-32"></div>
    </div>
  );
}