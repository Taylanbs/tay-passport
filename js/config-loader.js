/**
 * Carrega config/site.json (URL do backend) e patients/{id}.json (personalização).
 * Isso é o que permite reaproveitar a mesma base de código para qualquer paciente:
 * basta criar um novo arquivo em /patients/ e apontar o link para ?p=id-da-paciente.
 */
const TAY = {
  siteConfig: null,
  patientConfig: null,

  getPatientId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('p') || params.get('patient') || 'ligia';
  },

  async loadAll() {
    const [site, patient] = await Promise.all([
      fetch('config/site.json').then(r => r.json()).catch(() => ({})),
      fetch(`patients/${this.getPatientId()}.json`).then(r => {
        if (!r.ok) throw new Error('Paciente não encontrada');
        return r.json();
      })
    ]);
    this.siteConfig = site;
    this.patientConfig = patient;
    return { site, patient };
  }
};
