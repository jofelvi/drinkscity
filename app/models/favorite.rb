# == Schema Information
#
# Table name: favorites
#
#  id               :integer          not null, primary key
#  favoritable_type :string           not null
#  favoritable_id   :integer          not null
#  favoritor_type   :string           not null
#  favoritor_id     :integer          not null
#  scope            :string           default("favorite"), not null
#  blocked          :boolean          default(FALSE), not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#

class Favorite < ActiveRecord::Base

    extend ActsAsFavoritor::FavoritorLib
    extend ActsAsFavoritor::FavoriteScopes

    belongs_to :favoritable, polymorphic: true
    belongs_to :favoritor, polymorphic: true

    def block!
        self.update_attributes blocked: true
    end

end
