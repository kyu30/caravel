import type {StructureResolver} from 'sanity/structure'
import {
  DocumentTextIcon,
  UserIcon,
  EarthGlobeIcon,
  TagIcon,
  InboxIcon,
} from '@sanity/icons'

/**
 * Custom Studio sidebar. The editorial intake queue is pulled to the top and
 * split by status so editors can work "Pending" like a to-do list.
 */
export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('The Caravel')
    .items([
      S.listItem()
        .title('Editorial queue')
        .icon(InboxIcon)
        .child(
          S.list()
            .title('Editorial queue')
            .items([
              S.listItem()
                .title('Pending')
                .icon(InboxIcon)
                .child(
                  S.documentList()
                    .title('Pending submissions')
                    .filter('_type == "submission" && status == "pending"')
                    .defaultOrdering([{field: 'submittedAt', direction: 'desc'}]),
                ),
              S.listItem()
                .title('In review')
                .child(
                  S.documentList()
                    .title('In review')
                    .filter('_type == "submission" && status == "in-review"')
                    .defaultOrdering([{field: 'submittedAt', direction: 'desc'}]),
                ),
              S.listItem()
                .title('Published')
                .child(
                  S.documentList()
                    .title('Published submissions')
                    .filter('_type == "submission" && status == "published"')
                    .defaultOrdering([{field: 'submittedAt', direction: 'desc'}]),
                ),
              S.listItem()
                .title('Rejected')
                .child(
                  S.documentList()
                    .title('Rejected submissions')
                    .filter('_type == "submission" && status == "rejected"')
                    .defaultOrdering([{field: 'submittedAt', direction: 'desc'}]),
                ),
              S.divider(),
              S.listItem()
                .title('All submissions')
                .child(
                  S.documentTypeList('submission').title('All submissions'),
                ),
            ]),
        ),

      S.divider(),

      S.listItem()
        .title('Articles')
        .icon(DocumentTextIcon)
        .child(
          S.list()
            .title('Articles')
            .items([
              S.listItem()
                .title('Published')
                .child(
                  S.documentList()
                    .title('Published articles')
                    .filter('_type == "article" && status == "published"')
                    .defaultOrdering([{field: 'publishDate', direction: 'desc'}]),
                ),
              S.listItem()
                .title('Drafts')
                .child(
                  S.documentList()
                    .title('Draft articles')
                    .filter('_type == "article" && status == "draft"')
                    .defaultOrdering([{field: '_updatedAt', direction: 'desc'}]),
                ),
              S.listItem()
                .title('Featured')
                .child(
                  S.documentList()
                    .title('Featured articles')
                    .filter('_type == "article" && featured == true')
                    .defaultOrdering([{field: 'publishDate', direction: 'desc'}]),
                ),
              S.divider(),
              S.listItem().title('All articles').child(S.documentTypeList('article').title('All articles')),
            ]),
        ),

      S.listItem().title('Authors & staff').icon(UserIcon).child(S.documentTypeList('author').title('Authors & staff')),

      S.divider(),

      S.listItem()
        .title('Taxonomy')
        .icon(TagIcon)
        .child(
          S.list()
            .title('Taxonomy')
            .items([
              S.listItem()
                .title('Regions')
                .icon(EarthGlobeIcon)
                .child(S.documentTypeList('region').title('Regions')),
              S.listItem()
                .title('Sections')
                .icon(TagIcon)
                .child(S.documentTypeList('section').title('Sections')),
            ]),
        ),
    ])
