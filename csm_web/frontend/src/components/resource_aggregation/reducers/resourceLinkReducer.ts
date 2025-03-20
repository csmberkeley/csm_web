import { emptyLink, Link, LinkKeys } from "../ResourceTypes";

interface ResourceLinkReducerState {
  existingLinks: Map<number, Link>;
  newLinks: Link[];
}

export enum ResourceLinkActionType {
  UpdateField,
  DeleteLink,
  AddLink
}

export enum ResourceLinkKind {
  EXISTING = "EXISTING_LINK",
  NEW = "NEW_LINK"
}

export type ResourceLinkReducerAction =
  | {
      type: ResourceLinkActionType.UpdateField;
      kind: ResourceLinkKind;
      field: LinkKeys.name | LinkKeys.url;
      linkId: number;
      value: string;
    }
  | {
      type: ResourceLinkActionType.DeleteLink;
      kind: ResourceLinkKind;
      linkId: number;
    }
  | {
      type: ResourceLinkActionType.AddLink;
    };

export function resourceLinkReducer(
  { existingLinks, newLinks }: ResourceLinkReducerState,
  action: ResourceLinkReducerAction
): ResourceLinkReducerState {
  /**
   * Retrieves a link, and calls the callback function on the link.
   * The callback should modify the link object in-place.
   */
  const retrieveAndExecuteLink = (linkKind: ResourceLinkKind, linkId: number, callback: (link: Link) => void) => {
    // retrieve the link
    let link: Link;
    if (linkKind === ResourceLinkKind.EXISTING) {
      if (existingLinks.has(linkId)) {
        link = existingLinks.get(linkId)!;
      } else {
        throw new Error(`Link not found: id ${linkId}`);
      }
    } else {
      link = newLinks[linkId];
    }

    // modify the link
    callback(link);

    // return updated links
    if (linkKind === ResourceLinkKind.EXISTING) {
      return { existingLinks: new Map(existingLinks), newLinks };
    } else {
      return { existingLinks, newLinks: [...newLinks] };
    }
  };

  switch (action.type) {
    case ResourceLinkActionType.UpdateField: {
      return retrieveAndExecuteLink(action.kind, action.linkId, link => {
        link[action.field] = action.value;
      });
    }

    case ResourceLinkActionType.DeleteLink: {
      if (action.kind === ResourceLinkKind.EXISTING) {
        return retrieveAndExecuteLink(action.kind, action.linkId, link => {
          link.deleted = true;
        });
      } else {
        const updatedLinks = [...newLinks];
        updatedLinks.splice(action.linkId, 1);
        console.log({ id: action.linkId, newLinks, updatedLinks });
        return { existingLinks, newLinks: updatedLinks };
      }
    }

    case ResourceLinkActionType.AddLink: {
      return { existingLinks, newLinks: [...newLinks, emptyLink(newLinks)] };
    }
  }
}
