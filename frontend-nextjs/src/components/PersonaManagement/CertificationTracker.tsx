import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tooltip,
  Badge,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  Security as SecurityIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useCertifications } from '../../hooks/useCertifications';
import { Certification, CertificationStatus, CertificationType, ComplianceLevel } from '../../types/certification';
import { formatDate, formatCertificationStatus, formatCertificationType } from '../../utils/formatters';

interface CertificationTrackerProps {
  personaId?: string;
  showPersonaColumn?: boolean;
}

const CertificationTracker: React.FC<CertificationTrackerProps> = ({
  personaId,
  showPersonaColumn = true
}) => {
  const {
    certifications,
    loading,
    error,
    createCertification,
    updateCertification,
    deleteCertification,
    getCertificationStats,
    renewCertification
  } = useCertifications();

  const [filteredCertifications, setFilteredCertifications] = useState<Certification[]>([]);
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CertificationStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<CertificationType | 'ALL'>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceLevel | 'ALL'>('ALL');
  const [certificationStats, setCertificationStats] = useState<any>(null);

  useEffect(() => {
    loadCertificationStats();
  }, []);

  useEffect(() => {
    filterCertifications();
  }, [certifications, searchTerm, statusFilter, typeFilter, expiryFilter, complianceFilter, personaId]);

  const loadCertificationStats = async () => {
    try {
      const stats = await getCertificationStats();
      setCertificationStats(stats);
    } catch (error) {
      console.error('Failed to load certification stats:', error);
    }
  };

  const filterCertifications = () => {
    let filtered = certifications;

    // Filter by persona if specified
    if (personaId) {
      filtered = filtered.filter(cert => cert.personaId === personaId);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cert =>
        cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.issuingAuthority.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.persona.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.persona.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(cert => cert.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(cert => cert.type === typeFilter);
    }

    // Compliance filter
    if (complianceFilter !== 'ALL') {
      filtered = filtered.filter(cert => cert.complianceLevel === complianceFilter);
    }

    // Expiry filter
    if (expiryFilter !== 'ALL') {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(cert => {
        if (!cert.expiryDate) return expiryFilter === 'ALL';
        const expiryDate = new Date(cert.expiryDate);

        switch (expiryFilter) {
          case 'EXPIRING_SOON':
            return expiryDate > now && expiryDate <= thirtyDaysFromNow;
          case 'EXPIRED':
            return expiryDate <= now;
          default:
            return true;
        }
      });
    }

    setFilteredCertifications(filtered);
  };

  const handleCreateCertification = () => {
    setSelectedCertification(null);
    setIsFormOpen(true);
  };

  const handleEditCertification = (certification: Certification) => {
    setSelectedCertification(certification);
    setIsFormOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteCertification = async (certification: Certification) => {
    if (window.confirm(`Are you sure you want to delete the certification "${certification.name}"?`)) {
      try {
        await deleteCertification(certification.id);
        setAnchorEl(null);
      } catch (error) {
        console.error('Failed to delete certification:', error);
      }
    }
  };

  const handleRenewCertification = async (certification: Certification) => {
    try {
      await renewCertification(certification.id);
      setAnchorEl(null);
    } catch (error) {
      console.error('Failed to renew certification:', error);
    }
  };

  const getStatusIcon = (status: CertificationStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon color="success" />;
      case 'EXPIRED':
        return <WarningIcon color="error" />;
      case 'SUSPENDED':
        return <WarningIcon color="warning" />;
      case 'REVOKED':
        return <WarningIcon color="error" />;
      case 'PENDING_RENEWAL':
        return <ScheduleIcon color="primary" />;
      default:
        return <AssignmentIcon color="action" />;
    }
  };

  const getTypeIcon = (type: CertificationType) => {
    switch (type) {
      case 'PROFESSIONAL':
        return <StarIcon color="primary" />;
      case 'REGULATORY':
        return <SecurityIcon color="error" />;
      case 'INTERNAL':
        return <BusinessIcon color="info" />;
      case 'VENDOR':
        return <AssignmentIcon color="warning" />;
      case 'ACADEMIC':
        return <SchoolIcon color="success" />;
      default:
        return <AssignmentIcon color="action" />;
    }
  };

  const getComplianceColor = (level: ComplianceLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'error';
      case 'ADVANCED':
        return 'warning';
      case 'STANDARD':
        return 'info';
      case 'BASIC':
        return 'default';
      default:
        return 'default';
    }
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry > now && expiry <= thirtyDaysFromNow;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) <= new Date();
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Certification Tracker
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCertificationStats}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateCertification}
          >
            Add Certification
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Certification Stats */}
      {certificationStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" />
                  <Box>
                    <Typography variant="h6">{certificationStats.active || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{certificationStats.expiringSoon || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Expiring Soon
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="error" />
                  <Box>
                    <Typography variant="h6">{certificationStats.expired || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Expired
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon color="error" />
                  <Box>
                    <Typography variant="h6">{certificationStats.regulatory || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Regulatory
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="info" />
                  <Box>
                    <Typography variant="h6">{certificationStats.pendingRenewal || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Pending Renewal
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{filteredCertifications.length}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as CertificationStatus | 'ALL')}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="EXPIRED">Expired</MenuItem>
            <MenuItem value="SUSPENDED">Suspended</MenuItem>
            <MenuItem value="REVOKED">Revoked</MenuItem>
            <MenuItem value="PENDING_RENEWAL">Pending Renewal</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) => setTypeFilter(e.target.value as CertificationType | 'ALL')}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="PROFESSIONAL">Professional</MenuItem>
            <MenuItem value="REGULATORY">Regulatory</MenuItem>
            <MenuItem value="INTERNAL">Internal</MenuItem>
            <MenuItem value="VENDOR">Vendor</MenuItem>
            <MenuItem value="ACADEMIC">Academic</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Compliance</InputLabel>
          <Select
            value={complianceFilter}
            label="Compliance"
            onChange={(e) => setComplianceFilter(e.target.value as ComplianceLevel | 'ALL')}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="CRITICAL">Critical</MenuItem>
            <MenuItem value="ADVANCED">Advanced</MenuItem>
            <MenuItem value="STANDARD">Standard</MenuItem>
            <MenuItem value="BASIC">Basic</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Expiry</InputLabel>
          <Select
            value={expiryFilter}
            label="Expiry"
            onChange={(e) => setExpiryFilter(e.target.value as 'ALL' | 'EXPIRING_SOON' | 'EXPIRED')}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="EXPIRING_SOON">Expiring Soon</MenuItem>
            <MenuItem value="EXPIRED">Expired</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Certifications Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {showPersonaColumn && <TableCell>Personnel</TableCell>}
              <TableCell>Certification</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Compliance Level</TableCell>
              <TableCell>Issuing Authority</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Expiry Date</TableCell>
              <TableCell>Days to Expiry</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCertifications.map((certification) => (
              <TableRow key={certification.id}>
                {showPersonaColumn && (
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {certification.persona.firstName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {certification.persona.firstName} {certification.persona.lastName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {certification.persona.department}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                )}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getTypeIcon(certification.type)}
                    <Box>
                      <Typography variant="body2">{certification.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {certification.certificateNumber}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={formatCertificationType(certification.type)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(certification.status)}
                    <Chip
                      label={formatCertificationStatus(certification.status)}
                      color={certification.status === 'ACTIVE' ? 'success' : 
                             certification.status === 'EXPIRED' ? 'error' : 'default'}
                      size="small"
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={certification.complianceLevel}
                    color={getComplianceColor(certification.complianceLevel) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{certification.issuingAuthority}</Typography>
                </TableCell>
                <TableCell>{formatDate(certification.issueDate)}</TableCell>
                <TableCell>
                  {certification.expiryDate ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isExpired(certification.expiryDate) && (
                        <Badge color="error" variant="dot">
                          <WarningIcon fontSize="small" color="error" />
                        </Badge>
                      )}
                      {isExpiringSoon(certification.expiryDate) && !isExpired(certification.expiryDate) && (
                        <Badge color="warning" variant="dot">
                          <WarningIcon fontSize="small" color="warning" />
                        </Badge>
                      )}
                      <Typography variant="body2">
                        {formatDate(certification.expiryDate)}
                      </Typography>
                    </Box>
                  ) : (
                    'No Expiry'
                  )}
                </TableCell>
                <TableCell>
                  {certification.expiryDate ? (
                    <Typography 
                      variant="body2"
                      color={isExpired(certification.expiryDate) ? 'error' : 
                             isExpiringSoon(certification.expiryDate) ? 'warning' : 'textPrimary'}
                    >
                      {getDaysUntilExpiry(certification.expiryDate)} days
                    </Typography>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => {
                      setSelectedCertification(certification);
                      setAnchorEl(e.currentTarget);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleEditCertification(selectedCertification!)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {selectedCertification?.status === 'EXPIRED' && (
          <MenuItem onClick={() => handleRenewCertification(selectedCertification!)}>
            <RefreshIcon sx={{ mr: 1 }} />
            Renew
          </MenuItem>
        )}
        {selectedCertification?.certificateUrl && (
          <MenuItem onClick={() => window.open(selectedCertification.certificateUrl, '_blank')}>
            <DownloadIcon sx={{ mr: 1 }} />
            Download Certificate
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDeleteCertification(selectedCertification!)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CertificationTracker;
