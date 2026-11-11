/** Footer entry points.
 *
 *  Two implementations, chosen by capability presence rather than load order:
 *  `FooterSegmentClient` when pi-dev-stack publishes the footer capability,
 *  `StandaloneFooter` when nothing does. See each file for the rules.
 */
export { StandaloneFooter } from "./ui/footer.standalone.js";
export { FooterSegmentClient } from "./ui/footer.segment.client.js";
export {
  HA_SEGMENT_ID,
  type FooterConn,
  type FooterHost,
  type StackFooterApi,
} from "./ui/footer.types.js";
