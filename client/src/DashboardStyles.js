// DashboardStyles.js

export const theme = {
  colors: {
    primary: '#00695C',
    primaryHover: '#00796B',
    accent: '#26A69A',
    surface: '#E0F2F1',
    surfaceAlt: '#B2DFDB',
    border: '#80CBC4',
    shadow: '0 6px 18px rgba(0, 77, 64, 0.18)',
    text: '#111827',
    textMuted: '#6b7280',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#dc2626',
    inStock: '#4caf50',
    lowStock: '#f44336',
    outOfStock: '#9e0b0f',
  },
};

// Sidebar styles
export const sidebarStyle = {
  width: '230px',
  background: 'linear-gradient(180deg, #004D40 0%, #00695C 100%)',
  borderRight: `1px solid ${theme.colors.border}`,
  boxShadow: '2px 0 14px rgba(0, 77, 64, 0.35)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '20px 12px',
};

export const iconGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

export const sidebarLink = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  textDecoration: 'none',
  color: '#E0F2F1',
  borderRadius: '10px',
  border: '1px solid transparent',
  backgroundColor: 'transparent',
  transition: 'transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease',
  boxShadow: 'none',
  minHeight: '48px',
  overflow: 'hidden',
};

export const iconWrapper = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const labelStyle = {
  fontSize: '15px',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '140px',
  flex: 1,
};

// Dashboard card styles
export const professionalCardStyle = {
  background: theme.colors.surface,
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 4px 20px rgba(13, 71, 161, 0.08)',
  border: `1px solid ${theme.colors.border}`,
  transition: 'all 0.3s ease',
  cursor: 'pointer',
};

export const alertCardStyle = {
  background: 'linear-gradient(135deg, #DEEAF5 0%, #CBDCEB 100%)',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 4px 20px rgba(211, 47, 47, 0.08)',
  border: `1px solid #ffcdd2`,
  transition: 'all 0.3s ease',
  cursor: 'pointer',
};

export const cardHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '16px',
  gap: '16px',
};

export const iconContainerStyle = (bgColor, iconColor) => ({
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: bgColor,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: iconColor,
  flexShrink: 0,
});

export const cardTitleStyle = {
  margin: '0 0 4px 0',
  fontSize: '18px',
  fontWeight: '700',
  color: theme.colors.text,
  lineHeight: '1.2',
};

export const cardSubtitleStyle = {
  margin: '0',
  fontSize: '13px',
  color: theme.colors.textMuted,
  fontWeight: '500',
};

export const metricContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

export const metricValueStyle = {
  fontSize: '36px',
  fontWeight: '800',
  color: theme.colors.primary,
  lineHeight: '1',
  margin: '0',
};

export const statusBreakdownStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

export const statusItemStyle = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '13px',
};

export const trendIndicatorStyle = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '13px',
};

export const lowStockListStyle = {
  marginTop: '12px',
  padding: '12px',
  background: '#DEEAF5',
  borderRadius: '8px',
  border: `1px solid #ffcdd2`,
};

export const lowStockItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 8px',
  background: '#CBDCEB',
  borderRadius: '6px',
  border: `1px solid #ffebee`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  marginBottom: '4px',
};

// Map section styles
export const mapSectionStyle = {
  background: theme.colors.surface,
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 20px rgba(13, 71, 161, 0.08)',
  border: `1px solid ${theme.colors.border}`,
  transition: 'all 0.3s ease',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
};

export const mapHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '20px',
  gap: '16px',
};

export const mapIconContainerStyle = {
  width: '56px',
  height: '56px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.colors.primary,
  flexShrink: 0,
};

export const mapTitleStyle = {
  margin: '0 0 6px 0',
  fontSize: '24px',
  fontWeight: '800',
  color: theme.colors.primary,
};

export const mapDescriptionStyle = {
  margin: '0',
  fontSize: '15px',
  color: theme.colors.textMuted,
  lineHeight: '1.5',
  fontWeight: '500',
};

export const mapPreviewStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '24px',
  flexWrap: 'wrap',
  flex: 1,
};

export const mapPreviewContentStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  flex: 1,
  minWidth: '300px',
};

export const mapPreviewIconStyle = {
  width: '80px',
  height: '80px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%)',
  border: `2px solid ${theme.colors.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.colors.primary,
};

export const mapPreviewTextStyle = {
  flex: 1,
  minWidth: '200px',
};

export const mapFeaturesStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

export const featureItemStyle = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '13px',
  color: theme.colors.textMuted,
  fontWeight: '500',
};

export const mapButtonContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minWidth: '180px',
};

export const mapButtonStyle = {
  padding: '14px 20px',
  fontSize: '14px',
  fontWeight: '700',
  backgroundColor: theme.colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(0, 77, 64, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  letterSpacing: '0.5px',
  width: '100%',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const kioskButtonStyle = {
  padding: '14px 20px',
  fontSize: '14px',
  fontWeight: '700',
  backgroundColor: '#00bcd4',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(0, 188, 212, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  letterSpacing: '0.5px',
  width: '100%',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
