import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  MoreVert as MoreIcon,
  Folder as FolderIcon,
  Description as DocumentIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import DocumentUpload from './DocumentUpload';
import DocumentList from './DocumentList';
import DocumentGrid from './DocumentGrid';
import DocumentSearch from './DocumentSearch';
import { useDocumentManagement } from '../../hooks/useDocumentManagement';
import { formatDate, formatFileSize } from '../../utils/formatters';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`document-tabpanel-${index}`}
      aria-labelledby={`document-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const DocumentManagementDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  const {
    documents,
    categories,
    documentTypes,
    loading,
    error,
    searchDocuments,
    uploadDocument,
    getCategories,
    getDocumentTypes,
    refreshDocuments
  } = useDocumentManagement();

  useEffect(() => {
    // Load initial data
    getCategories();
    getDocumentTypes();
    refreshDocuments();
  }, []);

  useEffect(() => {
    // Perform search when query or filters change
    const delayedSearch = setTimeout(() => {
      if (searchQuery || selectedCategory || selectedType) {
        searchDocuments({
          query: searchQuery,
          categoryId: selectedCategory || undefined,
          typeId: selectedType || undefined
        });
      } else {
        refreshDocuments();
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, selectedCategory, selectedType]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleUploadComplete = (document: any) => {
    setIsUploadDialogOpen(false);
    refreshDocuments();
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedType('');
    handleFilterMenuClose();
  };

  const getDocumentStats = () => {
    if (!documents.length) return null;

    const stats = {
      total: documents.length,
      byStatus: documents.reduce((acc: any, doc) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1;
        return acc;
      }, {}),
      bySecurityLevel: documents.reduce((acc: any, doc) => {
        acc[doc.securityLevel] = (acc[doc.securityLevel] || 0) + 1;
        return acc;
      }, {}),
      totalSize: documents.reduce((acc, doc) => acc + (doc.fileSize || 0), 0)
    };

    return stats;
  };

  const stats = getDocumentStats();

  if (loading && !documents.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Document Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsUploadDialogOpen(true)}
        >
          Upload Documents
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <DocumentIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{stats.total}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Documents
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FolderIcon color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{categories.length}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Categories
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SecurityIcon color="warning" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{stats.bySecurityLevel.CONFIDENTIAL || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Confidential
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ScheduleIcon color="info" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{formatFileSize(stats.totalSize)}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Size
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ flex: 1, minWidth: 300 }}
            />
            
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={handleFilterMenuOpen}
            >
              Filters
            </Button>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
              >
                <ListIcon />
              </IconButton>
              <IconButton
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <GridIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Active Filters */}
          {(selectedCategory || selectedType) && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              {selectedCategory && (
                <Chip
                  label={`Category: ${categories.find(c => c.id === selectedCategory)?.name}`}
                  onDelete={() => setSelectedCategory('')}
                  size="small"
                />
              )}
              {selectedType && (
                <Chip
                  label={`Type: ${documentTypes.find(t => t.id === selectedType)?.name}`}
                  onDelete={() => setSelectedType('')}
                  size="small"
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="document tabs">
          <Tab label="All Documents" id="document-tab-0" />
          <Tab label="Recent" id="document-tab-1" />
          <Tab label="Shared" id="document-tab-2" />
          <Tab label="Archived" id="document-tab-3" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        {viewMode === 'list' ? (
          <DocumentList
            documents={documents}
            loading={loading}
            onDocumentAction={refreshDocuments}
          />
        ) : (
          <DocumentGrid
            documents={documents}
            loading={loading}
            onDocumentAction={refreshDocuments}
          />
        )}
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Typography variant="body1">Recent documents will be displayed here</Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Typography variant="body1">Shared documents will be displayed here</Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Typography variant="body1">Archived documents will be displayed here</Typography>
      </TabPanel>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterMenuClose}
      >
        <MenuItem>
          <TextField
            select
            label="Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
        </MenuItem>
        <MenuItem>
          <TextField
            select
            label="Document Type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Types</MenuItem>
            {documentTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </TextField>
        </MenuItem>
        <MenuItem onClick={clearFilters}>
          Clear All Filters
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <Dialog
        open={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Documents</DialogTitle>
        <DialogContent>
          <DocumentUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            categories={categories}
            documentTypes={documentTypes}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsUploadDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentManagementDashboard;
