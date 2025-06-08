import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { PersonaProfile, ConsentRecord, ConsentType } from '../../types/persona';
import { useGDPRConsent } from '../../hooks/useGDPRConsent';
import { formatDate, formatDateTime } from '../../utils/formatters';

interface ConsentManagementProps {
  open: boolean;
  persona: PersonaProfile | null;
  onClose: () => void;
}

const consentTypes: { type: ConsentType; label: string; description: string; required: boolean }[] = [
  {
    type: 'DATA_PROCESSING',
    label: 'Data Processing',
    description: 'Processing of personal data for employment purposes',
    required: true
  },
  {
    type: 'MARKETING',
    label: 'Marketing Communications',
    description: 'Receiving marketing emails and communications',
    required: false
  },
  {
    type: 'ANALYTICS',
    label: 'Analytics',
    description: 'Usage analytics and performance tracking',
    required: false
  },
  {
    type: 'COOKIES',
    label: 'Cookies',
    description: 'Non-essential cookies for enhanced user experience',
    required: false
  },
  {
    type: 'THIRD_PARTY_SHARING',
    label: 'Third Party Sharing',
    description: 'Sharing data with trusted third-party partners',
    required: false
  },
  {
    type: 'PROFILING',
    label: 'Profiling',
    description: 'Automated decision-making and profiling',
    required: false
  }
];

const ConsentManagement: React.FC<ConsentManagementProps> = ({
  open,
  persona,
  onClose
}) => {
  const {
    consents,
    consentHistory,
    loading,
    error,
    updateConsent,
    getConsentHistory,
    exportConsentData,
    withdrawAllConsents
  } = useGDPRConsent();

  const [currentConsents, setCurrentConsents] = useState<Record<ConsentType, boolean>>({
    DATA_PROCESSING: false,
    MARKETING: false,
    ANALYTICS: false,
    COOKIES: false,
    THIRD_PARTY_SHARING: false,
    PROFILING: false
  });

  const [showHistory, setShowHistory] = useState(false);
  const [confirmWithdrawAll, setConfirmWithdrawAll] = useState(false);

  useEffect(() => {
    if (persona && open) {
      loadConsentData();
    }
  }, [persona, open]);

  const loadConsentData = async () => {
    if (!persona) return;

    try {
      // Load current consents
      const personaConsents = consents.filter(c => c.personaId === persona.id);
      const consentMap: Record<ConsentType, boolean> = {
        DATA_PROCESSING: false,
        MARKETING: false,
        ANALYTICS: false,
        COOKIES: false,
        THIRD_PARTY_SHARING: false,
        PROFILING: false
      };

      personaConsents.forEach(consent => {
        if (consent.status === 'GRANTED') {
          consentMap[consent.consentType] = true;
        }
      });

      setCurrentConsents(consentMap);

      // Load consent history
      await getConsentHistory(persona.id);
    } catch (error) {
      console.error('Failed to load consent data:', error);
    }
  };

  const handleConsentChange = async (consentType: ConsentType, granted: boolean) => {
    if (!persona) return;

    try {
      await updateConsent({
        personaId: persona.id,
        consentType,
        granted,
        purpose: getConsentPurpose(consentType),
        legalBasis: getLegalBasis(consentType),
        dataCategories: getDataCategories(consentType),
        retentionPeriod: getRetentionPeriod(consentType)
      });

      setCurrentConsents(prev => ({
        ...prev,
        [consentType]: granted
      }));
    } catch (error) {
      console.error('Failed to update consent:', error);
    }
  };

  const handleExportData = async () => {
    if (!persona) return;

    try {
      await exportConsentData(persona.id);
    } catch (error) {
      console.error('Failed to export consent data:', error);
    }
  };

  const handleWithdrawAllConsents = async () => {
    if (!persona) return;

    try {
      await withdrawAllConsents(persona.id, 'User requested withdrawal of all consents');
      setCurrentConsents({
        DATA_PROCESSING: false,
        MARKETING: false,
        ANALYTICS: false,
        COOKIES: false,
        THIRD_PARTY_SHARING: false,
        PROFILING: false
      });
      setConfirmWithdrawAll(false);
    } catch (error) {
      console.error('Failed to withdraw all consents:', error);
    }
  };

  const getConsentPurpose = (type: ConsentType): string => {
    const purposes = {
      DATA_PROCESSING: 'Employment administration and legal compliance',
      MARKETING: 'Marketing communications and company updates',
      ANALYTICS: 'System usage analytics and performance improvement',
      COOKIES: 'Enhanced user experience and preferences',
      THIRD_PARTY_SHARING: 'Integration with trusted business partners',
      PROFILING: 'Automated decision-making for personalization'
    };
    return purposes[type];
  };

  const getLegalBasis = (type: ConsentType): string => {
    const legalBases = {
      DATA_PROCESSING: 'Contract performance and legal obligation',
      MARKETING: 'Consent',
      ANALYTICS: 'Legitimate interest',
      COOKIES: 'Consent',
      THIRD_PARTY_SHARING: 'Consent',
      PROFILING: 'Consent'
    };
    return legalBases[type];
  };

  const getDataCategories = (type: ConsentType): string[] => {
    const categories = {
      DATA_PROCESSING: ['Personal identifiers', 'Employment data', 'Contact information'],
      MARKETING: ['Contact information', 'Communication preferences'],
      ANALYTICS: ['Usage data', 'Performance metrics'],
      COOKIES: ['Browser data', 'Preferences'],
      THIRD_PARTY_SHARING: ['Contact information', 'Professional data'],
      PROFILING: ['Behavioral data', 'Preferences', 'Usage patterns']
    };
    return categories[type];
  };

  const getRetentionPeriod = (type: ConsentType): number => {
    const periods = {
      DATA_PROCESSING: 2555, // 7 years
      MARKETING: 1095,       // 3 years
      ANALYTICS: 730,        // 2 years
      COOKIES: 365,          // 1 year
      THIRD_PARTY_SHARING: 1095, // 3 years
      PROFILING: 730         // 2 years
    };
    return periods[type];
  };

  const getConsentStatus = (type: ConsentType) => {
    const consent = consents.find(c => c.personaId === persona?.id && c.consentType === type);
    return consent?.status || 'PENDING';
  };

  const getConsentDate = (type: ConsentType) => {
    const consent = consents.find(c => c.personaId === persona?.id && c.consentType === type);
    return consent?.grantedAt || consent?.withdrawnAt;
  };

  if (!persona) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            GDPR Consent Management - {persona.firstName} {persona.lastName}
          </Typography>
          <Box>
            <Tooltip title="View Consent History">
              <IconButton onClick={() => setShowHistory(!showHistory)}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Consent Data">
              <IconButton onClick={handleExportData}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Current Consents */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current Consent Status
          </Typography>
          
          <Grid container spacing={2}>
            {consentTypes.map((consentType) => (
              <Grid item xs={12} md={6} key={consentType.type}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {consentType.label}
                          {consentType.required && (
                            <Chip label="Required" size="small" color="error" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {consentType.description}
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={currentConsents[consentType.type]}
                            onChange={(e) => handleConsentChange(consentType.type, e.target.checked)}
                            disabled={consentType.required && currentConsents[consentType.type]}
                            color="primary"
                          />
                        }
                        label=""
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {currentConsents[consentType.type] ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <CancelIcon color="error" fontSize="small" />
                      )}
                      <Typography variant="caption" color="textSecondary">
                        Status: {getConsentStatus(consentType.type)}
                        {getConsentDate(consentType.type) && (
                          <> • {formatDate(getConsentDate(consentType.type)!)}</>
                        )}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Consent History */}
        {showHistory && (
          <Box sx={{ mb: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Consent History
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Consent Type</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>IP Address</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {consentHistory
                    .filter(record => record.personaId === persona.id)
                    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                    .map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDateTime(record.lastUpdated)}</TableCell>
                        <TableCell>{record.consentType.replace('_', ' ')}</TableCell>
                        <TableCell>
                          {record.grantedAt && record.withdrawnAt 
                            ? (new Date(record.grantedAt) > new Date(record.withdrawnAt) ? 'Granted' : 'Withdrawn')
                            : record.grantedAt ? 'Granted' : 'Withdrawn'
                          }
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.status}
                            color={record.status === 'GRANTED' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{record.version}</TableCell>
                        <TableCell>{record.ipAddress || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* GDPR Rights Information */}
        <Box sx={{ mb: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Your GDPR Rights
          </Typography>
          
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="body2">
              Under GDPR, you have the right to:
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Access your personal data</li>
              <li>Rectify inaccurate personal data</li>
              <li>Erase your personal data (right to be forgotten)</li>
              <li>Restrict processing of your personal data</li>
              <li>Data portability</li>
              <li>Object to processing</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <Typography variant="body2">
              To exercise these rights, please contact our Data Protection Officer.
            </Typography>
          </Alert>
        </Box>

        {/* Withdraw All Consents */}
        {!confirmWithdrawAll ? (
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmWithdrawAll(true)}
            >
              Withdraw All Consents
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Are you sure you want to withdraw all consents? This action cannot be undone and may affect
                your ability to use certain features of the system.
              </Typography>
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => setConfirmWithdrawAll(false)}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleWithdrawAllConsents}
              >
                Confirm Withdrawal
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConsentManagement;
