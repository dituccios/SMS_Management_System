import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { PersonaProfile, EmploymentType, PersonaStatus } from '../../types/persona';

interface PersonaFormProps {
  open: boolean;
  persona?: PersonaProfile | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const steps = ['Basic Information', 'Employment Details', 'GDPR Consent'];

const validationSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phoneNumber: yup.string().optional(),
  dateOfBirth: yup.date().optional(),
  nationalId: yup.string().optional(),
  department: yup.string().optional(),
  position: yup.string().optional(),
  employmentType: yup.string().required('Employment type is required'),
  startDate: yup.date().optional(),
  endDate: yup.date().optional(),
  dataProcessingConsent: yup.boolean().oneOf([true], 'Data processing consent is required'),
  marketingConsent: yup.boolean().optional(),
  consentVersion: yup.string().default('1.0')
});

const PersonaForm: React.FC<PersonaFormProps> = ({
  open,
  persona,
  onClose,
  onSubmit
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  });
  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    relationship: '',
    phoneNumber: '',
    email: ''
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: null,
      nationalId: '',
      employeeId: '',
      department: '',
      position: '',
      employmentType: 'FULL_TIME' as EmploymentType,
      startDate: null,
      endDate: null,
      managerId: '',
      dataProcessingConsent: false,
      marketingConsent: false,
      consentVersion: '1.0'
    }
  });

  useEffect(() => {
    if (persona) {
      reset({
        firstName: persona.firstName,
        lastName: persona.lastName,
        email: persona.email,
        phoneNumber: persona.phoneNumber || '',
        dateOfBirth: persona.dateOfBirth ? new Date(persona.dateOfBirth) : null,
        nationalId: persona.nationalId || '',
        employeeId: persona.employeeId || '',
        department: persona.department || '',
        position: persona.position || '',
        employmentType: persona.employmentType,
        startDate: persona.startDate ? new Date(persona.startDate) : null,
        endDate: persona.endDate ? new Date(persona.endDate) : null,
        managerId: persona.managerId || '',
        dataProcessingConsent: persona.dataProcessingConsent,
        marketingConsent: persona.marketingConsent || false,
        consentVersion: persona.consentVersion || '1.0'
      });

      if (persona.address) {
        setAddress(persona.address);
      }

      if (persona.emergencyContact) {
        setEmergencyContact(persona.emergencyContact);
      }
    } else {
      reset();
      setAddress({ street: '', city: '', state: '', postalCode: '', country: '' });
      setEmergencyContact({ name: '', relationship: '', phoneNumber: '', email: '' });
    }
  }, [persona, reset]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleFormSubmit = (data: any) => {
    const formData = {
      ...data,
      address: address.street ? address : null,
      emergencyContact: emergencyContact.name ? emergencyContact : null
    };
    onSubmit(formData);
  };

  const renderBasicInformation = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Controller
          name="firstName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="First Name"
              fullWidth
              required
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="lastName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Last Name"
              fullWidth
              required
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email"
              type="email"
              fullWidth
              required
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Phone Number"
              fullWidth
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber?.message}
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Controller
            name="dateOfBirth"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Date of Birth"
                value={field.value}
                onChange={field.onChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    error={!!errors.dateOfBirth}
                    helperText={errors.dateOfBirth?.message}
                  />
                )}
              />
            )}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="nationalId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="National ID"
              fullWidth
              error={!!errors.nationalId}
              helperText={errors.nationalId?.message}
            />
          )}
        />
      </Grid>

      {/* Address Section */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Address
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Street Address"
          fullWidth
          value={address.street}
          onChange={(e) => setAddress({ ...address, street: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="City"
          fullWidth
          value={address.city}
          onChange={(e) => setAddress({ ...address, city: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="State/Province"
          fullWidth
          value={address.state}
          onChange={(e) => setAddress({ ...address, state: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Postal Code"
          fullWidth
          value={address.postalCode}
          onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Country"
          fullWidth
          value={address.country}
          onChange={(e) => setAddress({ ...address, country: e.target.value })}
        />
      </Grid>

      {/* Emergency Contact Section */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Emergency Contact
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Contact Name"
          fullWidth
          value={emergencyContact.name}
          onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Relationship"
          fullWidth
          value={emergencyContact.relationship}
          onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Contact Phone"
          fullWidth
          value={emergencyContact.phoneNumber}
          onChange={(e) => setEmergencyContact({ ...emergencyContact, phoneNumber: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Contact Email"
          type="email"
          fullWidth
          value={emergencyContact.email}
          onChange={(e) => setEmergencyContact({ ...emergencyContact, email: e.target.value })}
        />
      </Grid>
    </Grid>
  );

  const renderEmploymentDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Controller
          name="employeeId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Employee ID"
              fullWidth
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="department"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Department"
              fullWidth
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="position"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Position"
              fullWidth
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="employmentType"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth required>
              <InputLabel>Employment Type</InputLabel>
              <Select
                {...field}
                label="Employment Type"
                error={!!errors.employmentType}
              >
                <MenuItem value="FULL_TIME">Full Time</MenuItem>
                <MenuItem value="PART_TIME">Part Time</MenuItem>
                <MenuItem value="CONTRACT">Contract</MenuItem>
                <MenuItem value="TEMPORARY">Temporary</MenuItem>
                <MenuItem value="INTERN">Intern</MenuItem>
                <MenuItem value="CONSULTANT">Consultant</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Start Date"
                value={field.value}
                onChange={field.onChange}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            )}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12} sm={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="End Date"
                value={field.value}
                onChange={field.onChange}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            )}
          />
        </LocalizationProvider>
      </Grid>
    </Grid>
  );

  const renderGDPRConsent = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        In accordance with GDPR regulations, we need your explicit consent to process personal data.
      </Alert>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data Processing Consent
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          We will process your personal data for employment purposes, including but not limited to:
          payroll, benefits administration, performance management, training records, and compliance
          with legal obligations.
        </Typography>
        <Controller
          name="dataProcessingConsent"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  {...field}
                  checked={field.value}
                  color="primary"
                />
              }
              label="I consent to the processing of my personal data for employment purposes (Required)"
            />
          )}
        />
        {errors.dataProcessingConsent && (
          <Typography color="error" variant="caption" display="block">
            {errors.dataProcessingConsent.message}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Marketing Communications
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          We would like to send you information about company events, training opportunities,
          and other relevant communications.
        </Typography>
        <Controller
          name="marketingConsent"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  {...field}
                  checked={field.value}
                  color="primary"
                />
              }
              label="I consent to receiving marketing communications (Optional)"
            />
          )}
        />
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="textSecondary">
          You can withdraw your consent at any time by contacting the Data Protection Officer.
          Withdrawal of consent will not affect the lawfulness of processing based on consent
          before its withdrawal.
        </Typography>
      </Box>
    </Box>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInformation();
      case 1:
        return renderEmploymentDetails();
      case 2:
        return renderGDPRConsent();
      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {persona ? 'Edit Personnel' : 'Add New Personnel'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ width: '100%', mt: 2 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box sx={{ mt: 3 }}>
            {getStepContent(activeStep)}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleSubmit(handleFormSubmit)}
          >
            {persona ? 'Update' : 'Create'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PersonaForm;
