export const COMPANIES = {
  'hetai-logistics': {
    id: 'hetai-logistics',
    name: '和泰链运',
    shortName: '链运',
    theme: {
      primary: 'blue',
      secondary: 'indigo'
    },
    features: {
      wms: true,
      mes: true,
      sap: true,
      productionReport: true,
      externalSystems: true,
      advancedAnalytics: true
    }
  },
  'hetai-mechanical': {
    id: 'hetai-mechanical',
    name: '和泰机电',
    shortName: '机电',
    theme: {
      primary: 'green',
      secondary: 'emerald'
    },
    features: {
      wms: false,
      mes: false,
      sap: false,
      productionReport: true,
      externalSystems: false,
      advancedAnalytics: false
    }
  }
};

export const getCompanyConfig = (companyId) => {
  return COMPANIES[companyId] || COMPANIES['hetai-logistics'];
};