import { CoverageReport } from 'monocart-coverage-reports'
import { browserCoverageOptions } from './coverage'

// Workers only cache entries; one generate() writes the raw data the merge step reads.
const teardown = async () => {
  await new CoverageReport({ ...browserCoverageOptions, reports: ['raw'] }).generate()
}
export default teardown
