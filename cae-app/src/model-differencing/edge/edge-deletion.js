import EdgeDifference from "./edge-difference";

/**
 * Represents an edge that got deleted from the model.
 */
export default class EdgeDeletion extends EdgeDifference {

  /**
   * Constructor for edge that got deleted from the model.
   * @param edgeKey Key of the deleted edge, i.e. a SyncMeta id.
   * @param edgeValue Value of the deleted edge.
   * @param edgeSource Source node of the edge.
   * @param edgeTarget Target node of the edge.
   */
  constructor(edgeKey, edgeValue, edgeSource, edgeTarget) {
    super(edgeKey, edgeValue, edgeSource, edgeTarget);
  }

  /**
   * Creates the HTML representation of the deleted edge.
   * @param checkboxListener Only set when checkbox should be displayed.
   * @returns {HTMLDivElement} HTML representation of the deleted edge.
   */
  toHTMLElement(checkboxListener) {
    const base = super.toHTMLElement(checkboxListener);
    // set correct icon
    const icon = base.getElementsByTagName("iron-icon")[0];
    icon.icon = "remove";
    icon.style.setProperty("color", "#DB4437");
    return base;
  }

  applyToModel(model) {
    delete model.edges[this.key];
  }

}