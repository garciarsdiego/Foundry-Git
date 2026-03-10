import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// The Flow Builder is now accessible via the Flows list page.
// Redirect to /flows so users can create and manage flows there.
export default function FlowBuilderPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/flows', { replace: true }); }, [navigate]);
  return null;
}
