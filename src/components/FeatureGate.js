import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCompanyConfig } from '../config/companies';

const FeatureGate = ({ feature, children, fallback = null }) => {
  const { user } = useAuth();
  const companyConfig = getCompanyConfig(user?.companyId);
  
  if (!companyConfig.features[feature]) {
    return fallback;
  }
  
  return children;
};

export default FeatureGate;