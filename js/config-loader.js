/**
 * Carrega config/site.json (URL do backend) e a configuração da paciente.
 * A configuração da paciente NÃO vem mais de arquivos patients/*.json — ela é
 * cadastrada pela nutricionista direto no painel (dashboard.html) e fica salva
 * na aba "Pacientes" da planilha. Isso é o que permite criar uma paciente nova
 * sem tocar em código/GitHub: o link passaporte.html?p=id-da-paciente já
 * funciona assim que ela for cadastrada no painel.
 *
 * Para funcionar offline depois do primeiro acesso, a config é guardada em
 * cache no localStorage do navegador da paciente.
 */
const TAY = {
  siteConfig: null,
  patientConfig: null,

  getPatientId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('p') || params.get('patient') || '';
  },

  async loadAll() {
    const site = await fetch('config/site.json').then(r => r.json()).catch(() => ({}));
    this.siteConfig = site;

    const id = this.getPatientId();
    if (!id) throw new Error('Link incompleto: falta ?p=id-da-paciente na URL.');

    const cacheKey = `tay_patientcfg_${id}`;
    const url = site.sync_url;

    try {
      if (!url || url.startsWith('COLE_AQUI')) throw new Error('Backend não configurado ainda.');
      const res = await fetch(`${url}?action=patient&id=${encodeURIComponent(id)}`).then(r => r.json());
      if (!res.ok) throw new Error(res.error === 'not_found' ? 'Paciente não encontrada.' : (res.error || 'Erro ao buscar paciente.'));
      this.patientConfig = res.patient;
      localStorage.setItem(cacheKey, JSON.stringify(res.patient));
    } catch (err) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        this.patientConfig = JSON.parse(cached);
      } else {
        throw err;
      }
    }

    return { site, patient: this.patientConfig };
  }
};
