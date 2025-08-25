import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import analysisService from '../services/analysisService';
import { notificationManager } from '../components/NotificationSystem';
import { BACKEND_URL } from '../constants';
import { networkErrorHandler } from '../components/NetworkErrorHandler';

// This thunk is for getting the initial list of risks
export const fetchTrackedRisks = createAsyncThunk(
  'analysis/fetchTrackedRisks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await networkErrorHandler.fetchWithRetry(`${BACKEND_URL}/companies/satellites/with-risk-analysis`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch risk data.');
      }
      const trackedSatellitesWithRisk = await response.json();
      return trackedSatellitesWithRisk.filter(sat => sat.hasRisk);
    } catch (error) {
      notificationManager.error(error.message, { title: 'Failed to Fetch Risk Data' });
      return rejectWithValue(error.message);
    }
  }
);

export const startManeuverPlanning = createAsyncThunk(
  'analysis/startManeuverPlanning',
  async (scc_number, { dispatch, rejectWithValue }) => {
    try {
      const data = await analysisService.triggerManeuverPlanning(scc_number);
      
      // Handle the new response format
      if (data.status === 'completed') {
        notificationManager.success(data.message, { title: 'Maneuver Planning Completed' });
        // Refresh the data immediately to show the updated maneuver results
        dispatch(fetchTrackedRisks());
      } else {
        notificationManager.info(data.message, { title: 'Maneuver Planning Initiated' });
        // If it's still processing, wait a bit then refresh
        setTimeout(() => {
          dispatch(fetchTrackedRisks());
        }, 5000);
      }

      return { scc_number, status: data.status, results: data.results || [] };
    } catch (error) {
      notificationManager.error(error.message, { title: 'Planning Failed' });
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAllSocratesRisks = createAsyncThunk(
  'analysis/fetchAllSocratesRisks',
  async (_, { rejectWithValue }) => {
    try {
      const conjunctions = await analysisService.getAllSocratesConjunctions();
      return conjunctions;
    } catch (error) {
      notificationManager.error(error.message, { title: 'Failed to Fetch Socrates Data' });
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  riskySatellites: [],
  allSocratesRisks: [],
  loading: false,
  error: null,
  planningInProgress: {},
  lastPlan: { status: null, message: null, summary: null, results: [] },
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    clearLastPlan(state) {
      state.lastPlan = { status: null, message: null, summary: null, results: [] };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrackedRisks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrackedRisks.fulfilled, (state, action) => {
        state.loading = false;
        action.payload.forEach(sat => {
            if (state.planningInProgress[sat.noradId]) {
                state.planningInProgress[sat.noradId] = false;
            }
        });
        state.riskySatellites = action.payload;
      })
      .addCase(fetchTrackedRisks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.riskySatellites = [];
      })
      .addCase(startManeuverPlanning.pending, (state, action) => {
        state.planningInProgress[action.meta.arg] = true;
      })
      .addCase(startManeuverPlanning.fulfilled, (state, action) => {
        state.planningInProgress[action.meta.arg] = false;
        // Merge immediate results, if any
        const results = action.payload?.results || [];
        if (results.length > 0) {
          const resultById = new Map(results.map(r => [r.id, r]));
          state.riskySatellites = state.riskySatellites.map(sat => ({
            ...sat,
            riskEvents: (sat.riskEvents || []).map(evt => {
              const upd = resultById.get(evt.id);
              return upd
                ? {
                    ...evt,
                    required_burn_dv_mps: upd.required_burn_dv_mps,
                    new_apogee_km: upd.new_apogee_km,
                    new_perigee_km: upd.new_perigee_km,
                  }
                : evt;
            }),
          }));
        }
        // Store last plan response for immediate display
        state.lastPlan = {
          status: action.payload?.status || null,
          message: action.payload?.status === 'completed' ? 'Maneuver planning completed' : 'Maneuver planning initiated',
          summary: action.payload?.summary || null,
          results,
        };
        // If the planning was completed, we don't need to show the planning state anymore
        if (action.payload.status === 'completed') {
          delete state.planningInProgress[action.meta.arg];
        }
      })
      .addCase(startManeuverPlanning.rejected, (state, action) => {
        state.planningInProgress[action.meta.arg] = false;
        state.error = action.payload;
      })
      .addCase(fetchAllSocratesRisks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllSocratesRisks.fulfilled, (state, action) => {
        state.loading = false;
        state.allSocratesRisks = action.payload;
      })
      .addCase(fetchAllSocratesRisks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.allSocratesRisks = [];
      });
  },
});

export const selectAnalysis = (state) => state.analysis;
export default analysisSlice.reducer;
export const { clearLastPlan } = analysisSlice.actions;