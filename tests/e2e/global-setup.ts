import { CoverageReport } from 'monocart-coverage-reports'
import { browserCoverageOptions } from './coverage'

const setup = async () => {
  new CoverageReport({ ...browserCoverageOptions, reports: ['raw'] }).cleanCache()
}
export default setup
