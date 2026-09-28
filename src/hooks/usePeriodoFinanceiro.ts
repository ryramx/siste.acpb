import { useSearchParams } from 'react-router-dom';
import { lerPeriodo, Periodo } from '../utils/periodo';

/** Período escolhido nas telas do Financeiro, guardado na URL (ver utils/periodo). */
export function usePeriodoFinanceiro(): [Periodo, (novo: Periodo) => void] {
  const [params, setParams] = useSearchParams();
  const periodo = lerPeriodo(params);
  const mudar = (novo: Periodo) => {
    const proximos = new URLSearchParams(params);
    proximos.set('ano', String(novo.ano));
    if (novo.mes) proximos.set('mes', String(novo.mes));
    else proximos.delete('mes');
    setParams(proximos, { replace: true });
  };
  return [periodo, mudar];
}
