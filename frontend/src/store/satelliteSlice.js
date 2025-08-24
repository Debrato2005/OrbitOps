import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import satelliteService from "../services/satelliteService";
// CORRECTED: The imported function name now matches the export in analysisSlice.js
import { fetchTrackedRisks } from "./analysisSlice"; 

export const fetchSatellites = createAsyncThunk(
  "satellites/fetchSatellites",
  async (_, { rejectWithValue }) => {
    try {
      return await satelliteService.getSatellites();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addSatellite = createAsyncThunk(
  "satellites/addSatellite",
  async (satelliteData, { dispatch, rejectWithValue }) => {
    try {
      const newCompanyData = await satelliteService.addSatellite(satelliteData);
      
      // --- NEW LOGIC ---
      // After the satellite is successfully added and the state is about to be updated,
      // dispatch the action to refresh the tracked conjunctions list.
      // This ensures the sidebar will have the latest data next time it's opened.
      console.log('[Frontend] New satellite added. Triggering refresh of tracked risks.');
      // CORRECTED: The dispatched action name is now correct.
      dispatch(fetchTrackedRisks());
      // --- END OF NEW LOGIC ---

      return newCompanyData.trackedSatellites;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const satelliteSlice = createSlice({
  name: "satellites",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSatellites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSatellites.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSatellites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addSatellite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSatellite.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(addSatellite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const selectSatellites = (state) => state.satellites.items;
export const selectSatellitesLoading = (state) => state.satellites.loading;
export const selectSatellitesError = (state) => state.satellites.error;

export default satelliteSlice.reducer;