import { ANALYSIS_BACKEND_URL } from '../constants';
import { networkErrorHandler } from '../components/NetworkErrorHandler';

class AnalysisService {
  async getConjunctions(scc_number) {
    const response = await networkErrorHandler.fetchWithRetry(`${ANALYSIS_BACKEND_URL}/conjunctions/${scc_number}`);
    if (!response.ok) {
      throw new Error('Failed to fetch conjunction data.');
    }
    return response.json();
  }

  async getAllSocratesConjunctions() {
    const response = await networkErrorHandler.fetchWithRetry(`${ANALYSIS_BACKEND_URL}/conjunctions`);
    if (!response.ok) {
      throw new Error('Failed to fetch all conjunctions data.');
    }
    const data = await response.json();
    return data.conjunctions || [];
  }

  async triggerManeuverPlanning(scc_number) {
    const response = await networkErrorHandler.fetchWithRetry(`${ANALYSIS_BACKEND_URL}/plan/${scc_number}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to start maneuver planning.');
    }
    return response.json();
  }
}

const analysisService = new AnalysisService();
export default analysisService;